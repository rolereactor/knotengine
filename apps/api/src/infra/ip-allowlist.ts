import { FastifyRequest, FastifyReply } from "fastify";
import { Merchant } from "@qodinger/knot-database";
import { apiError } from "../utils/api-error.js";

/**
 * 🔒 IP Allowlist Middleware
 * Checks if request IP is in merchant's allowed list
 */
export async function ipAllowlistMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const merchant = (request as any).merchant as
    | typeof Merchant.prototype
    | undefined;

  if (!merchant) {
    // No merchant context, skip IP check (let other auth handle it)
    return;
  }

  // Skip if IP allowlisting is not enabled
  if (!merchant.ipAllowlistEnabled) {
    return;
  }

  // Skip if no allowed IPs configured
  if (
    !merchant.allowedIpAddresses ||
    merchant.allowedIpAddresses.length === 0
  ) {
    return;
  }

  const requestIp = request.ip;
  const isAllowed = merchant.allowedIpAddresses?.some((allowedIp: string) => {
    // Support exact match
    if (allowedIp === requestIp) {
      return true;
    }

    // Support CIDR notation (e.g., 192.168.1.0/24)
    if (allowedIp.includes("/")) {
      return ipInCidr(requestIp, allowedIp);
    }

    // Support wildcard (e.g., 192.168.1.*)
    if (allowedIp.includes("*")) {
      const pattern = allowedIp.replace(/\*/g, ".*");
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(requestIp);
    }

    return false;
  });

  if (!isAllowed) {
    request.log.warn(
      { merchantId: merchant.merchantId, ip: requestIp },
      "IP address not in allowlist",
    );
    return apiError(
      reply,
      403,
      "forbidden",
      "Your IP address is not allowed to access this merchant account.",
    );
  }
}

/**
 * Check if an IP address is within a CIDR range
 */
function ipInCidr(ip: string, cidr: string): boolean {
  const [range, bits] = cidr.split("/");
  const bitCount = parseInt(bits, 10);
  const mask = bitCount === 0 ? 0 : (0xffffffff << (32 - bitCount)) >>> 0;

  const ipNum = ipToNumber(ip);
  const rangeNum = ipToNumber(range);

  return (ipNum & mask) === (rangeNum & mask);
}

/**
 * Convert IP address to number
 */
function ipToNumber(ip: string): number {
  return (
    ip
      .split(".")
      .reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0
  );
}
