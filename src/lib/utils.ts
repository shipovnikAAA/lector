import { randomBytes, createHash } from "node:crypto";

export function buildAbsoluteUrl(path: string) {
  return new URL(path, process.env.NEXT_PUBLIC_APP_URL).toString();
}

export function randomState(size = 24) {
  return randomBytes(size).toString("hex");
}

export function hashState(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
