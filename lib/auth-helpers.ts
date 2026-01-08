import { NextRequest } from "next/server";
import { getCurrentUser } from "./jwt";
import { User } from "./auth";

/**
 * Obtém o usuário atual da requisição usando o token JWT
 * Retorna null se não houver token ou se o token for inválido
 */
export async function getCurrentUserFromRequest(request: NextRequest): Promise<User | null> {
  const token = request.cookies.get("auth-token")?.value;
  return getCurrentUser(token);
}

/**
 * Obtém o ID do usuário atual da requisição
 * Retorna null se não houver token ou se o token for inválido
 */
export async function getCurrentUserIdFromRequest(request: NextRequest): Promise<number | null> {
  const user = await getCurrentUserFromRequest(request);
  return user ? user.id : null;
}

