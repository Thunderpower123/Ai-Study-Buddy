import axios from "axios";
import { ApiError } from "../utils/ApiError.js";

export const ingestDocument = async ({ fileBuffer, filename, mimetype, sessionId, documentId }) => {
    try {
        const file_b64 = fileBuffer.toString("base64");

        const response = await axios.post(
            `${process.env.PYTHON_CLIENT_URL}/ingest`,
            {
                file_b64,
                filename,
                mimetype,
                sessionId,
                documentId,
            },
            {
                headers: {
                    "x-service-key": process.env.SERVICE_KEY,
                    "Content-Type": "application/json",
                },
                // Large PDFs can take time to extract + embed + upsert to Pinecone.
                // Without a timeout, a hung Python client blocks this request forever.
                // 2 minutes is generous even for a 100MB file on a cold start.
                timeout: 120_000,
            }
        );

        if (!response.data?.success) {
            // Surface the Python-side error message if one was returned
            const detail = response.data?.detail || response.data?.message || "Python ingest returned success: false";
            throw new ApiError(500, `Ingest failed: ${detail}`);
        }

        return response.data.chunks_stored;

    } catch (error) {
        // Preserve the original message rather than swallowing it.
        // If it's already an ApiError (from the block above), re-throw it as-is.
        if (error instanceof ApiError) throw error;

        // Axios network / timeout errors
        if (error.code === "ECONNABORTED") {
            throw new ApiError(504, `Ingest timed out for file: ${filename}`);
        }
        if (error.code === "ECONNREFUSED") {
            throw new ApiError(503, "Python client is not reachable");
        }

        throw new ApiError(500, `Ingest service error: ${error.message}`);
    }
};