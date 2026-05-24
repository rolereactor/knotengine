import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { UploadController } from "../controllers/upload.controller.js";

export async function uploadRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();

  // ──────────────────────────────────────────────
  // POST /v1/upload/logo — Upload merchant logo to Cloudinary
  // Accepts a base64 Data URI, uploads to Cloudinary, returns the URL
  // ──────────────────────────────────────────────
  server.post(
    "/v1/upload/logo",
    {
      preHandler: UploadController.oauthHook,
      schema: {
        body: z.object({
          image: z.string().min(1).max(5_000_000), // base64 data URI e.g. "data:image/png;base64,..." (~3.75 MB decoded)
          merchantId: z.string().optional(), // used as public_id for easy management
        }),
      },
    },
    UploadController.uploadLogo as any,
  );
}
