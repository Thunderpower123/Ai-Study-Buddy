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
                // Large PDFs (200-500MB base64) need more time to extract + embed + upsert.
                // 10 minutes covers even the largest textbooks on a cold start.
                timeout: 600_000, // 10 minutes

                // Axios has a default maxBodyLength / maxContentLength of 10MB.
                // A 200MB PDF becomes ~267MB of base64 JSON — must raise this or
                // axios silently rejects the outgoing request before it even hits Python.
                maxBodyLength: Infinity,
                maxContentLength: Infinity,
            }
        );

        if (!response.data?.success) {
            const detail = response.data?.detail || response.data?.message || "Python ingest returned success: false";
            throw new ApiError(500, `Ingest failed: ${detail}`);
        }

        return response.data.chunks_stored;

    } catch (error) {
        if (error instanceof ApiError) throw error;

        if (error.code === "ECONNABORTED") {
            throw new ApiError(504, `Ingest timed out for file: ${filename}`);
        }
        if (error.code === "ECONNREFUSED") {
            throw new ApiError(503, "Python client is not reachable");
        }

        throw new ApiError(500, `Ingest service error: ${error.message}`);
    }
};
