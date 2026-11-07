import "server-only";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const options = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
const DUMMY_HASH = `scrypt$${"00".repeat(16)}$${"00".repeat(64)}`;

function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, options, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = await derive(password, salt);
  return `scrypt$${salt}$${hash.toString("hex")}`;
}

export async function checkPassword(
  password: string,
  encoded: string | null | undefined,
): Promise<boolean> {
  const [algorithm, salt, hash] = (encoded || DUMMY_HASH).split("$");
  if (algorithm !== "scrypt" || !salt || !hash || !/^[a-f0-9]{128}$/.test(hash))
    return false;
  const actual = await derive(password, salt);
  return timingSafeEqual(actual, Buffer.from(hash, "hex")) && Boolean(encoded);
}
