import jwt from "jsonwebtoken";
import { getUserByEmail } from "./auth";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export interface JWTPayload {
  userId: number;
  email: string;
  iat?: number;
  exp?: number;
}

export function generateToken(userId: number, email: string): string {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET não está definido");
  }
  // @ts-ignore - jsonwebtoken types issue with expiresIn
  return jwt.sign(
    { userId, email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

export async function getCurrentUser(token: string | null | undefined) {
  if (!token) return null;
  
  const payload = verifyToken(token);
  if (!payload) return null;
  
  const user = await getUserByEmail(payload.email);
  return user;
}

