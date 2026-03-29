import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Document } from "../models/document.models.js";
import { Session } from "../models/session.models.js";
import { ingestDocument } from "../services/ingest.service.js";
import axios from "axios";

const MAX_TOTAL_BYTES = 500 * 1024 * 1024; // 500 MB overall per request

const fileTypeMap = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "text/plain": "text",
    "text/markdown": "text",
};

// 🔹 Upload (multi-file)
export const uploadDocument = asyncHandler(async (req, res) => {
    const sessionId = req.params.id;

    // Ownership check using findOne with userId — single query, no separate comparison
    const session = await Session.findOne({ _id: sessionId, userId: req.user._id });
    if (!session) {
        throw new ApiError(403, "Unauthorized session");
    }

    // req.files is an array when upload.array() is used
    if (!req.files || req.files.length === 0) {
        throw new ApiError(400, "No files uploaded");
    }

    // Enforce 500 MB total across all files in this request
    const totalBytes = req.files.reduce((sum, f) => sum + f.size, 0);
    if (totalBytes > MAX_TOTAL_BYTES) {
        throw new ApiError(400, "Total upload size exceeds 500 MB limit");
    }

    // Process each file: ingest → save Document record
    const savedDocs = [];
    const errors = [];

    for (const file of req.files) {
        // Create the DB record first so we have a documentId for Pinecone metadata
        const doc = await Document.create({
            sessionId,
            filename: file.originalname,
            fileType: fileTypeMap[file.mimetype] || "text",
        });

        try {
            // Run through RAG ingest pipeline
            const chunks = await ingestDocument({
                fileBuffer: file.buffer,
                filename: file.originalname,
                mimetype: file.mimetype,
                sessionId,
                documentId: doc._id.toString(),
            });

            doc.totalChunks = chunks;
            await doc.save();
            savedDocs.push(doc);

        } catch (err) {
            // Ingest failed — delete the orphaned Document record so the UI
            // doesn't show a file that has no vectors and can't be queried
            await doc.deleteOne();
            errors.push({ filename: file.originalname, error: err.message });
            console.error(`[uploadDocument] Ingest failed for ${file.originalname}:`, err.message);
        }
    }

    // If every file failed, return 500
    if (savedDocs.length === 0) {
        throw new ApiError(500, "All file ingestions failed", errors.map(e => e.error));
    }

    return res.status(201).json(
        new ApiResponse(
            201,
            { documents: savedDocs, errors },
            `${savedDocs.length} of ${req.files.length} document(s) uploaded successfully`
        )
    );
});

// 🔹 List
export const listDocuments = asyncHandler(async (req, res) => {
    const sessionId = req.params.id;

    // Ownership check — verify the session belongs to this user before listing its docs
    const session = await Session.findOne({ _id: sessionId, userId: req.user._id });
    if (!session) throw new ApiError(403, "Unauthorized session");

    const docs = await Document.find({ sessionId });

    return res.status(200).json(new ApiResponse(200, docs));
});

// 🔹 Delete
export const deleteDocument = asyncHandler(async (req, res) => {
    const doc = await Document.findById(req.params.id);

    if (!doc) throw new ApiError(404, "Document not found");

    // Ownership check — verify the document's session belongs to this user
    const session = await Session.findOne({ _id: doc.sessionId, userId: req.user._id });
    if (!session) throw new ApiError(403, "Unauthorized");

    // Delete Pinecone vectors first — same ordering rationale as deleteSession
    try {
        await axios.post(
            `${process.env.PYTHON_CLIENT_URL}/delete`,
            {
                sessionId: doc.sessionId.toString(),
                documentId: doc._id.toString(),
            },
            {
                headers: { "x-service-key": process.env.SERVICE_KEY },
                timeout: 15000,
            }
        );
    } catch (err) {
        // Log but don't block — orphaned vectors are harmless, user can still delete
        console.error(`[deleteDocument] Pinecone delete failed for doc ${doc._id}:`, err.message);
    }

    await doc.deleteOne();

    return res.status(200).json(new ApiResponse(200, {}, "Document deleted"));
});
