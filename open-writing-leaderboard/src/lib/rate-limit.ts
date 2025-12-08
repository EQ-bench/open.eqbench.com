import { prisma } from "./db";

const RATE_LIMIT_WINDOW_HOURS = 24;
const MAX_SUBMISSIONS_PER_USER = 100;
const MAX_SUBMISSIONS_PER_IP = 150;

/**
 * Normalize IP address for rate limiting:
 * - IPv4: use full address
 * - IPv6: use /64 prefix to handle privacy extensions
 */
export function normalizeIpForRateLimit(ip: string): string {
  // Check if IPv6
  if (ip.includes(":")) {
    // Extract /64 prefix (first 4 groups)
    const parts = ip.split(":");
    // Handle :: expansion
    const expanded = expandIPv6(ip);
    const groups = expanded.split(":");
    // Take first 4 groups (64 bits)
    return groups.slice(0, 4).join(":") + "::/64";
  }
  // IPv4: use as-is
  return ip;
}

/**
 * Expand IPv6 :: shorthand to full form
 */
function expandIPv6(ip: string): string {
  if (!ip.includes("::")) {
    return ip;
  }
  const parts = ip.split("::");
  const left = parts[0] ? parts[0].split(":") : [];
  const right = parts[1] ? parts[1].split(":") : [];
  const missing = 8 - left.length - right.length;
  const middle = Array(missing).fill("0");
  return [...left, ...middle, ...right].join(":");
}

/**
 * Hash IP for storage (we don't need to store raw IPs for rate limiting)
 */
export async function hashIp(ip: string): Promise<string> {
  const normalized = normalizeIpForRateLimit(ip);
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized + process.env.AUTH_SECRET);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  userSubmissions?: number;
  ipSubmissions?: number;
  resetAt?: Date;
}

/**
 * Check if a submission is allowed based on rate limits
 */
export async function checkRateLimit(
  userId: string,
  ipHash: string
): Promise<RateLimitResult> {
  const windowStart = new Date();
  windowStart.setHours(windowStart.getHours() - RATE_LIMIT_WINDOW_HOURS);

  // Check user submission count
  const userSubmissions = await prisma.submissions.count({
    where: {
      user_id: userId,
      created_at: { gte: windowStart },
    },
  });

  if (userSubmissions >= MAX_SUBMISSIONS_PER_USER) {
    // Find when the oldest submission in the window will expire
    const oldestInWindow = await prisma.submissions.findFirst({
      where: {
        user_id: userId,
        created_at: { gte: windowStart },
      },
      orderBy: { created_at: "asc" },
    });

    const resetAt = oldestInWindow?.created_at
      ? new Date(oldestInWindow.created_at.getTime() + RATE_LIMIT_WINDOW_HOURS * 60 * 60 * 1000)
      : undefined;

    return {
      allowed: false,
      reason: `You have reached the maximum of ${MAX_SUBMISSIONS_PER_USER} submissions per ${RATE_LIMIT_WINDOW_HOURS} hours`,
      userSubmissions,
      resetAt,
    };
  }

  // Check IP submission count (catches multi-account abuse)
  const ipSubmissions = await prisma.submissions.count({
    where: {
      created_ip: ipHash,
      created_at: { gte: windowStart },
    },
  });

  if (ipSubmissions >= MAX_SUBMISSIONS_PER_IP) {
    return {
      allowed: false,
      reason: `Too many submissions from this network. Please try again later.`,
      ipSubmissions,
    };
  }

  return {
    allowed: true,
    userSubmissions,
    ipSubmissions,
  };
}
