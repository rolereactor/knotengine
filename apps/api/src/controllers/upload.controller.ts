import { v2 as cloudinary } from "cloudinary";
import { FastifyReply, FastifyRequest } from "fastify";
import { safeCompare } from "../utils/crypto.js";
import { apiError } from "../utils/api-error.js";

export const UploadController = {
  oauthHook: async (request: FastifyRequest, reply: FastifyReply) => {
    const oauthId = request.headers["x-oauth-id"] as string;
    const secret = request.headers["x-internal-secret"] as string;

    if (!oauthId || !safeCompare(secret, process.env.INTERNAL_SECRET || "")) {
      return apiError(reply, 401, "unauthorized", "Authentication required.");
    }
  },

  uploadLogo: async (
    request: FastifyRequest<{
      Body: { image: string; merchantId?: string };
    }>,
    reply: FastifyReply,
  ) => {
    const { image, merchantId } = request.body;

    // Configure Cloudinary lazily at request time (after dotenv has loaded)
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    if (!process.env.CLOUDINARY_API_SECRET) {
      return apiError(
        reply,
        503,
        "internal_error",
        "Image upload is not configured.",
      );
    }

    try {
      const publicId = merchantId
        ? `knotengine/logos/${merchantId}`
        : `knotengine/logos/${Date.now()}`;

      const result = await cloudinary.uploader.upload(image, {
        public_id: publicId,
        overwrite: true,
        resource_type: "image",
        // Auto-crop to square and optimize
        transformation: [
          { width: 256, height: 256, crop: "fill", gravity: "auto" },
          { fetch_format: "auto", quality: "auto" },
        ],
      });

      return reply.code(200).send({
        url: result.secure_url,
        publicId: result.public_id,
      });
    } catch (err) {
      console.error(
        "[Upload] Cloudinary upload failed:",
        err instanceof Error ? err.message : String(err),
      );
      return apiError(reply, 500, "internal_error", "Image upload failed.");
    }
  },
};
