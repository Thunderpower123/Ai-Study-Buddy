import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * uploadOnCloudinary
 *
 * Uploads a file buffer directly to Cloudinary using an upload stream.
 * We use this instead of writing to disk first because Multer gives us
 * a buffer (memoryStorage) — no temp file path exists to pass to Cloudinary.
 *
 * resource_type "raw" is correct for PDFs, PPTX, and DOCX files.
 * For profile avatars or images, resource_type should be "image".
 *
 * Returns the full Cloudinary result object.
 * The two fields we store in MongoDB are:
 *   result.secure_url  → cloudinaryUrl  (for download / display)
 *   result.public_id   → cloudinaryPublicId  (needed to delete the file later)
 */
const uploadOnCloudinary = (fileBuffer, filename) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type: "raw",
                public_id: filename,
                folder: "ai-study-buddy",
            },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );
        streamifier.createReadStream(fileBuffer).pipe(uploadStream);
    });
};

/**
 * deleteFromCloudinary
 *
 * Deletes a file from Cloudinary by its public_id.
 * Call this when a document is deleted from a session so we don't
 * accumulate orphaned files on the free tier.
 */
const deleteFromCloudinary = async (publicId) => {
    try {
        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: "raw",
        });
        return result;
    } catch (error) {
        console.error("Cloudinary delete failed:", error);
        return null;
    }
};

export { uploadOnCloudinary, deleteFromCloudinary };
