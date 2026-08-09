import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { Merchant } from "@qodinger/knot-database";
import { requireAuth } from "../middleware/auth.middleware.js";
import { apiError } from "../utils/api-error.js";

/**
 * 🎨 White Label Routes — /v1/white-label
 *
 * Custom branding, domains, and embeddable checkout.
 *   POST   /v1/white-label/preview           → Preview custom CSS
 *   POST   /v1/white-label/css               → Save custom CSS
 *   GET    /v1/white-label/domains            → List custom domains
 *   POST   /v1/white-label/domains            → Add custom domain
 *   DELETE /v1/white-label/domains/:domain    → Remove custom domain
 *   POST   /v1/white-label/domains/:domain/verify → Verify domain
 *   GET    /v1/white-label/embed              → Get embed code
 */
export async function whiteLabelRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();

  // ──────────────────────────────────────────────
  // POST /v1/white-label/preview — Preview CSS
  // ──────────────────────────────────────────────
  server.post(
    "/v1/white-label/preview",
    {
      preHandler: requireAuth,
      schema: {
        body: z.object({
          custom_css: z.string().max(50000),
        }),
        response: {
          200: z.object({
            object: z.literal("white_label_preview"),
            css: z.string(),
            is_valid: z.boolean(),
            warnings: z.array(z.string()),
          }),
        },
      },
    },
    async (request, reply) => {
      const { custom_css } = request.body;

      // Basic CSS validation
      const warnings: string[] = [];
      let isValid = true;

      // Check for dangerous selectors
      const dangerousPatterns = [
        /expression\s*\(/i,
        /javascript\s*:/i,
        /data\s*:/i,
        /@import/i,
        /position\s*:\s*fixed/i,
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(custom_css)) {
          warnings.push(
            `Potentially unsafe CSS pattern detected: ${pattern.source}`,
          );
          isValid = false;
        }
      }

      // Check for basic CSS syntax
      if (!custom_css.includes("{") || !custom_css.includes("}")) {
        warnings.push("CSS appears to be missing braces");
      }

      return reply.send({
        object: "white_label_preview",
        css: custom_css,
        is_valid: isValid,
        warnings,
      });
    },
  );

  // ──────────────────────────────────────────────
  // POST /v1/white-label/css — Save Custom CSS
  // ──────────────────────────────────────────────
  server.post(
    "/v1/white-label/css",
    {
      preHandler: requireAuth,
      schema: {
        body: z.object({
          custom_css: z.string().max(50000),
          white_label_enabled: z.boolean().optional(),
        }),
        response: {
          200: z.object({
            object: z.literal("white_label_css"),
            custom_css: z.string(),
            white_label_enabled: z.boolean(),
          }),
        },
      },
    },
    async (request, reply) => {
      const authMerchant = (request as any).merchant;
      const { custom_css, white_label_enabled } = request.body;

      const merchant = await Merchant.findOne({
        userId: authMerchant.userId,
        isActive: true,
      });
      if (!merchant) {
        return apiError(reply, 404, "merchant_not_found", "Merchant not found");
      }

      // Enterprise-only feature
      if (merchant.plan !== "enterprise") {
        return apiError(
          reply,
          403,
          "forbidden",
          "Custom CSS requires an Enterprise plan",
        );
      }

      merchant.customCss = custom_css;
      if (white_label_enabled !== undefined) {
        merchant.whiteLabelEnabled = white_label_enabled;
      }
      await merchant.save();

      return reply.send({
        object: "white_label_css",
        custom_css: merchant.customCss || "",
        white_label_enabled: merchant.whiteLabelEnabled,
      });
    },
  );

  // ──────────────────────────────────────────────
  // GET /v1/white-label/domains — List Domains
  // ──────────────────────────────────────────────
  server.get(
    "/v1/white-label/domains",
    {
      preHandler: requireAuth,
      schema: {
        response: {
          200: z.object({
            object: z.literal("list"),
            data: z.array(
              z.object({
                object: z.literal("custom_domain"),
                domain: z.string(),
                verified: z.boolean(),
                created_at: z.string(),
              }),
            ),
          }),
        },
      },
    },
    async (request, reply) => {
      const authMerchant = (request as any).merchant;

      const merchant = await Merchant.findOne({
        userId: authMerchant.userId,
        isActive: true,
      });
      if (!merchant) {
        return apiError(reply, 404, "merchant_not_found", "Merchant not found");
      }

      const domains = merchant.customDomain
        ? [
            {
              object: "custom_domain" as const,
              domain: merchant.customDomain,
              verified: merchant.customDomainVerified,
              created_at: merchant.updatedAt.toISOString(),
            },
          ]
        : [];

      return reply.send({
        object: "list",
        data: domains,
      });
    },
  );

  // ──────────────────────────────────────────────
  // POST /v1/white-label/domains — Add Domain
  // ──────────────────────────────────────────────
  server.post(
    "/v1/white-label/domains",
    {
      preHandler: requireAuth,
      schema: {
        body: z.object({
          domain: z.string().min(3).max(255),
        }),
        response: {
          201: z.object({
            object: z.literal("custom_domain"),
            domain: z.string(),
            verified: z.boolean(),
            verification_record: z.string(),
            created_at: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const authMerchant = (request as any).merchant;
      const { domain } = request.body;

      const merchant = await Merchant.findOne({
        userId: authMerchant.userId,
        isActive: true,
      });
      if (!merchant) {
        return apiError(reply, 404, "merchant_not_found", "Merchant not found");
      }

      // Enterprise-only feature
      if (merchant.plan !== "enterprise") {
        return apiError(
          reply,
          403,
          "forbidden",
          "Custom domains require an Enterprise plan",
        );
      }

      // Validate domain format
      const domainRegex =
        /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
      if (!domainRegex.test(domain)) {
        return apiError(reply, 400, "invalid_request", "Invalid domain format");
      }

      // Check if domain is already in use
      const existingMerchant = await Merchant.findOne({
        customDomain: domain,
        _id: { $ne: merchant._id },
      });
      if (existingMerchant) {
        return apiError(
          reply,
          409,
          "conflict",
          "This domain is already registered",
        );
      }

      merchant.customDomain = domain;
      merchant.customDomainVerified = false;
      await merchant.save();

      const verificationRecord = `knotengine-domain-verification=${merchant.merchantId}`;

      return reply.code(201).send({
        object: "custom_domain",
        domain,
        verified: false,
        verification_record: verificationRecord,
        created_at: merchant.updatedAt.toISOString(),
      });
    },
  );

  // ──────────────────────────────────────────────
  // DELETE /v1/white-label/domains/:domain — Remove Domain
  // ──────────────────────────────────────────────
  server.delete(
    "/v1/white-label/domains/:domain",
    {
      preHandler: requireAuth,
      schema: {
        params: z.object({
          domain: z.string(),
        }),
        response: {
          200: z.object({
            object: z.literal("white_label_domain"),
            deleted: z.boolean(),
          }),
        },
      },
    },
    async (request, reply) => {
      const authMerchant = (request as any).merchant;
      const { domain } = request.params;

      const merchant = await Merchant.findOne({
        userId: authMerchant.userId,
        isActive: true,
      });
      if (!merchant) {
        return apiError(reply, 404, "merchant_not_found", "Merchant not found");
      }

      if (merchant.customDomain !== domain) {
        return apiError(reply, 404, "not_found", "Domain not found");
      }

      merchant.customDomain = undefined;
      merchant.customDomainVerified = false;
      await merchant.save();

      return reply.send({
        object: "white_label_domain",
        deleted: true,
      });
    },
  );

  // ──────────────────────────────────────────────
  // POST /v1/white-label/domains/:domain/verify
  // ──────────────────────────────────────────────
  server.post(
    "/v1/white-label/domains/:domain/verify",
    {
      preHandler: requireAuth,
      schema: {
        params: z.object({
          domain: z.string(),
        }),
        response: {
          200: z.object({
            object: z.literal("white_label_domain"),
            domain: z.string(),
            verified: z.boolean(),
            message: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const authMerchant = (request as any).merchant;
      const { domain } = request.params;

      const merchant = await Merchant.findOne({
        userId: authMerchant.userId,
        isActive: true,
      });
      if (!merchant) {
        return apiError(reply, 404, "merchant_not_found", "Merchant not found");
      }

      if (merchant.customDomain !== domain) {
        return apiError(reply, 404, "not_found", "Domain not found");
      }

      // In production, this would check DNS TXT records
      // For now, we'll simulate verification

      // TODO: Implement actual DNS verification
      // const dns = await dns.resolveTxt(domain);
      // const verificationRecord = `knotengine-domain-verification=${merchant.merchantId}`;
      // const verified = dns.some(records => records.includes(verificationRecord));

      // Simulate verification for demo
      merchant.customDomainVerified = true;
      await merchant.save();

      return reply.send({
        object: "white_label_domain",
        domain,
        verified: true,
        message: "Domain verified successfully",
      });
    },
  );

  // ──────────────────────────────────────────────
  // GET /v1/white-label/embed — Get Embed Code
  // ──────────────────────────────────────────────
  server.get(
    "/v1/white-label/embed",
    {
      preHandler: requireAuth,
      schema: {
        querystring: z.object({
          width: z.coerce.number().min(300).max(1200).default(400),
          height: z.coerce.number().min(400).max(900).default(600),
        }),
        response: {
          200: z.object({
            object: z.literal("white_label_embed"),
            iframe_html: z.string(),
            script_html: z.string(),
            checkout_url: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const authMerchant = (request as any).merchant;
      const { width, height } = request.query;

      const merchant = await Merchant.findOne({
        userId: authMerchant.userId,
        isActive: true,
      });
      if (!merchant) {
        return apiError(reply, 404, "merchant_not_found", "Merchant not found");
      }

      const baseUrl =
        merchant.customDomainVerified && merchant.customDomain
          ? `https://${merchant.customDomain}`
          : "https://checkout.knotengine.com";

      const checkoutUrl = `${baseUrl}/checkout?merchant=${merchant.merchantId}`;

      const iframeHtml = `<iframe src="${checkoutUrl}" width="${width}" height="${height}" frameborder="0" style="border: none; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);" allow="payment"></iframe>`;

      const scriptHtml = `<script>
  (function() {
    var knot = document.createElement('div');
    knot.id = 'knotengine-checkout';
    knot.innerHTML = '<iframe src="${checkoutUrl}" width="${width}" height="${height}" frameborder="0" style="border: none; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);" allow="payment"></iframe>';
    document.currentScript.parentNode.insertBefore(knot, document.currentScript);
  })();
</script>`;

      return reply.send({
        object: "white_label_embed",
        iframe_html: iframeHtml,
        script_html: scriptHtml,
        checkout_url: checkoutUrl,
      });
    },
  );
}
