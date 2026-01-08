import bcrypt from "bcryptjs";
import pool from "./db";

export interface User {
  id: number;
  email: string;
  password_hash: string;
  created_at: Date;
}

export async function createUser(email: string, password: string): Promise<User> {
  const passwordHash = await bcrypt.hash(password, 10);
  
  const result = await pool.query(
    "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at",
    [email, passwordHash]
  );
  
  return {
    id: result.rows[0].id,
    email: result.rows[0].email,
    password_hash: result.rows[0].password_hash,
    created_at: result.rows[0].created_at,
  };
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const result = await pool.query(
    "SELECT id, email, password_hash, created_at FROM users WHERE email = $1",
    [email]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return result.rows[0];
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

