/**
 * API Error Format Tests
 *
 * Two kinds of checks live here:
 *
 * 1. Static source scan — reads every .ts file under src/ and asserts that
 *    no raw `reply.code(N).send({ error: "..." })` patterns exist. Any
 *    future regression (someone bypassing apiError()) will fail this suite
 *    instantly without needing a running server.
 *
 * 2. apiError() unit tests — exercise the utility function directly to
 *    guarantee the envelope shape, type discriminator, and doc_url are
 *    always correct regardless of status code.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { apiError } from "../src/utils/api-error.js";
import type { FastifyReply } from "fastify";

// ─── Path helpers (ESM-safe) ──────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = join(__dirname, "../src");

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Recursively collect every .ts file under `dir` (excludes .d.ts). */
function getAllTsFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...getAllTsFiles(full));
    } else if (entry.endsWith(".ts") && !entry.endsWith(".d.ts")) {
      files.push(full);
    }
  }
  return files;
}

/**
 * Minimal mock of FastifyReply — enough to capture what apiError() sends.
 * Returns { statusCode, body } after apiError() is called.
 */
function createMockReply(): {
  reply: FastifyReply;
  result: () => { statusCode: number; body: unknown };
} {
  let capturedStatus = 0;
  let capturedBody: unknown = undefined;

  const reply = {
    code(status: number) {
      capturedStatus = status;
      return {
        send(body: unknown) {
          capturedBody = body;
          return reply;
        },
      };
    },
  } as unknown as FastifyReply;

  return {
    reply,
    result: () => ({ statusCode: capturedStatus, body: capturedBody }),
  };
}

// ─── 1. Static source scan ────────────────────────────────────────────────────

describe("Source code: no raw error responses", () => {
  const allFiles = getAllTsFiles(SRC_DIR);

  it("has zero .send({ error: … }) raw inline error sends", () => {
    /**
     * Matches any .send({ error: ... }) call.
     *
     * apiError() in utils/api-error.ts passes a `body` variable — it never
     * writes `.send({ error:` inline — so the only hits are raw bypasses.
     *
     * The test strips single-line comments before scanning so that commented-
     * out old code doesn't trigger a false positive.
     */
    const pattern = /\.send\(\s*\{\s*error\s*:/;

    const violations: string[] = [];

    for (const file of allFiles) {
      const content = readFileSync(file, "utf-8");
      // Strip single-line comments to avoid matching commented-out old code
      const stripped = content.replace(/\/\/[^\n]*/g, "");
      const lines = stripped.split("\n");

      lines.forEach((line, idx) => {
        if (pattern.test(line)) {
          // Relative path for readable output
          const rel = file.replace(SRC_DIR + "/", "");
          violations.push(`${rel}:${idx + 1}  →  ${line.trim()}`);
        }
      });
    }

    expect(violations).toEqual([]);
  });

  it("has no chained reply.code(4xx/5xx).send(...) calls that bypass apiError()", () => {
    /**
     * Catches the specific chained pattern: reply.code(<error-code>).send(...)
     * that does NOT go through apiError().
     *
     * The apiError() call site in api-error.ts is:
     *   return reply.code(status).send(body);   ← `body` is a variable
     *
     * All other reply.code(N).send({...}) with error-range codes are bypasses.
     */
    const chainedErrorPattern = /reply\.code\([45]\d{2}\)\.send\s*\(\s*\{/;

    const violations: string[] = [];

    for (const file of allFiles) {
      const content = readFileSync(file, "utf-8");
      const stripped = content.replace(/\/\/[^\n]*/g, "");
      const lines = stripped.split("\n");

      lines.forEach((line, idx) => {
        if (chainedErrorPattern.test(line)) {
          const rel = file.replace(SRC_DIR + "/", "");
          violations.push(`${rel}:${idx + 1}  →  ${line.trim()}`);
        }
      });
    }

    expect(violations).toEqual([]);
  });

  it("every file that uses reply.code() also imports apiError", () => {
    /**
     * If a file calls reply.code(), it must import apiError() — ensuring
     * that the author didn't accidentally skip the import and fall back to
     * raw sends when adding error paths in the future.
     *
     * Exceptions: api-error.ts itself (it IS apiError), and test files.
     */
    const usesReplyCode = /reply\.code\(/;
    const importsApiError = /import.*apiError.*from/;

    const violations: string[] = [];

    for (const file of allFiles) {
      // Skip the utility file itself, test files, and health check (no apiError responses)
      if (
        file.includes("api-error.ts") ||
        file.includes("/tests/") ||
        file.includes("routes/health.ts")
      )
        continue;

      const content = readFileSync(file, "utf-8");
      if (usesReplyCode.test(content) && !importsApiError.test(content)) {
        violations.push(file.replace(SRC_DIR + "/", ""));
      }
    }

    expect(violations).toEqual([]);
  });
});

// ─── 2. apiError() unit tests ────────────────────────────────────────────────

describe("apiError() shape contract", () => {
  it("always returns an object with an error envelope", () => {
    const { reply, result } = createMockReply();
    apiError(reply, 400, "invalid_request", "Test message.");
    const { body } = result();

    expect(body).toMatchObject({
      error: expect.objectContaining({
        type: expect.any(String),
        code: expect.any(String),
        message: expect.any(String),
        doc_url: expect.any(String),
      }),
    });
  });

  it("sets the HTTP status code correctly", () => {
    const cases: number[] = [400, 401, 403, 404, 409, 422, 429, 500, 503];

    for (const status of cases) {
      const { reply, result } = createMockReply();
      apiError(reply, status, "invalid_request", "msg");
      expect(result().statusCode).toBe(status);
    }
  });

  describe("type discriminator", () => {
    it("uses 'authentication_error' for 401", () => {
      const { reply, result } = createMockReply();
      apiError(reply, 401, "unauthorized", "msg");
      expect((result().body as any).error.type).toBe("authentication_error");
    });

    it("uses 'authentication_error' for 403", () => {
      const { reply, result } = createMockReply();
      apiError(reply, 403, "forbidden", "msg");
      expect((result().body as any).error.type).toBe("authentication_error");
    });

    it("uses 'rate_limit_error' for 429", () => {
      const { reply, result } = createMockReply();
      apiError(reply, 429, "rate_limit_exceeded", "msg");
      expect((result().body as any).error.type).toBe("rate_limit_error");
    });

    it("uses 'api_error' for 500", () => {
      const { reply, result } = createMockReply();
      apiError(reply, 500, "internal_error", "msg");
      expect((result().body as any).error.type).toBe("api_error");
    });

    it("uses 'api_error' for 503", () => {
      const { reply, result } = createMockReply();
      apiError(reply, 503, "internal_error", "msg");
      expect((result().body as any).error.type).toBe("api_error");
    });

    it("uses 'invalid_request_error' for 400", () => {
      const { reply, result } = createMockReply();
      apiError(reply, 400, "invalid_request", "msg");
      expect((result().body as any).error.type).toBe("invalid_request_error");
    });

    it("uses 'invalid_request_error' for 404", () => {
      const { reply, result } = createMockReply();
      apiError(reply, 404, "not_found", "msg");
      expect((result().body as any).error.type).toBe("invalid_request_error");
    });

    it("uses 'invalid_request_error' for 409", () => {
      const { reply, result } = createMockReply();
      apiError(reply, 409, "conflict", "msg");
      expect((result().body as any).error.type).toBe("invalid_request_error");
    });
  });

  describe("doc_url field", () => {
    it("always starts with the docs base URL", () => {
      const { reply, result } = createMockReply();
      apiError(reply, 400, "invalid_request", "msg");
      const url = (result().body as any).error.doc_url as string;
      expect(url).toMatch(/^https:\/\/docs\.knotengine\.com\/api\/errors#/);
    });

    it("anchors to the error code", () => {
      const codes = [
        "unauthorized",
        "forbidden",
        "merchant_not_found",
        "invalid_request",
        "internal_error",
        "rate_limit_exceeded",
      ] as const;

      for (const code of codes) {
        const { reply, result } = createMockReply();
        apiError(reply, 400, code, "msg");
        const url = (result().body as any).error.doc_url as string;
        expect(url).toBe(`https://docs.knotengine.com/api/errors#${code}`);
      }
    });
  });

  describe("param field", () => {
    it("includes param when provided", () => {
      const { reply, result } = createMockReply();
      apiError(reply, 400, "invalid_request", "msg", "email");
      expect((result().body as any).error.param).toBe("email");
    });

    it("omits param when not provided", () => {
      const { reply, result } = createMockReply();
      apiError(reply, 400, "invalid_request", "msg");
      expect((result().body as any).error).not.toHaveProperty("param");
    });
  });

  describe("message field", () => {
    it("preserves the message exactly as passed", () => {
      const msg = "Merchant ID is required.";
      const { reply, result } = createMockReply();
      apiError(reply, 400, "invalid_request", msg);
      expect((result().body as any).error.message).toBe(msg);
    });
  });

  describe("code field", () => {
    it("matches the code passed in", () => {
      const { reply, result } = createMockReply();
      apiError(reply, 401, "invalid_api_key", "Bad key.");
      expect((result().body as any).error.code).toBe("invalid_api_key");
    });
  });
});

// ─── 3. Error envelope completeness ─────────────────────────────────────────

describe("Error envelope completeness", () => {
  it("response body has exactly the expected keys (no extras leaked)", () => {
    const { reply, result } = createMockReply();
    apiError(reply, 400, "invalid_request", "msg");
    const body = result().body as any;

    // Top level has only 'error'
    expect(Object.keys(body)).toEqual(["error"]);

    // Inner error object has only the expected keys (no param if not passed)
    expect(Object.keys(body.error).sort()).toEqual(
      ["code", "doc_url", "message", "type"].sort(),
    );
  });

  it("response body with param has exactly the expected keys", () => {
    const { reply, result } = createMockReply();
    apiError(reply, 400, "invalid_request", "msg", "field_name");
    const body = result().body as any;

    expect(Object.keys(body.error).sort()).toEqual(
      ["code", "doc_url", "message", "param", "type"].sort(),
    );
  });
});
