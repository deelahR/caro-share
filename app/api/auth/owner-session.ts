import { createHmac, timingSafeEqual } from "node:crypto";

const ownerSessionCookie = "agribro_owner";
const sessionMaxAge = 60 * 60 * 24 * 14;

function sessionSecret() {
  return (
    process.env.AUTH_SECRET?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    "agribro-local-owner-session"
  );
}

function signOwner(ownerName: string) {
  return createHmac("sha256", sessionSecret()).update(ownerName).digest("hex");
}

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function encodeSessionValue(ownerName: string) {
  return `${encodeURIComponent(ownerName)}.${signOwner(ownerName)}`;
}

function cookieAttributes(maxAge: number) {
  const attributes = [
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${maxAge}`,
  ];

  if (process.env.NODE_ENV === "production") {
    attributes.push("Secure");
  }

  return attributes.join("; ");
}

export function ownerSessionHeader(ownerName: string) {
  return `${ownerSessionCookie}=${encodeSessionValue(ownerName)}; ${cookieAttributes(
    sessionMaxAge,
  )}`;
}

export function clearOwnerSessionHeader() {
  return `${ownerSessionCookie}=; ${cookieAttributes(0)}`;
}

export function getSessionOwner(request: Request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const sessionCookie = cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${ownerSessionCookie}=`));

  if (!sessionCookie) {
    return "";
  }

  const value = sessionCookie.slice(ownerSessionCookie.length + 1);
  const separator = value.lastIndexOf(".");

  if (separator <= 0) {
    return "";
  }

  let ownerName = "";

  try {
    ownerName = decodeURIComponent(value.slice(0, separator));
  } catch {
    return "";
  }
  const signature = value.slice(separator + 1);
  const expectedSignature = signOwner(ownerName);

  return safeCompare(signature, expectedSignature) ? ownerName : "";
}
