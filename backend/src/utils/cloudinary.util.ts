import cloudinary from "../config/cloudinary.js";
import { Readable } from "stream";

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  format?: string;
  resourceType?: string;
}

/**
 * Upload a file Buffer directly to Cloudinary using upload_stream
 * @param buffer - File memory buffer from Multer
 * @param folder - Cloudinary folder path
 * @param resourceType - 'auto' | 'image' | 'video' | 'raw'
 */
export const uploadBufferToCloudinary = (
  buffer: Buffer,
  folder = "civic_resolve/issues",
  resourceType: "auto" | "image" | "video" | "raw" = "auto"
): Promise<CloudinaryUploadResult> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
      },
      (error, result) => {
        if (error || !result) {
          console.error("Cloudinary upload error:", error);
          return reject(error || new Error("Failed to upload file to Cloudinary"));
        }

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          resourceType: result.resource_type,
        });
      }
    );

    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });
};
