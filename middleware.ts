import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Função simples para verificar se o token tem formato válido
// A validação completa do JWT será feita nas rotas de API (Node.js runtime)
// Isso é necessário porque o middleware roda no Edge Runtime que não suporta jsonwebtoken
function hasValidTokenFormat(token: string): boolean {
  // JWT tem formato: header.payload.signature (3 partes separadas por ponto)
  const parts = token.split('.');
  return parts.length === 3 && parts.every(part => part.length > 0);
}

// Rotas públicas que não precisam de autenticação
const publicRoutes = ["/", "/player", "/kiosk", "/api/public"];

// Rotas de API públicas (acessíveis sem autenticação)
const publicApiRoutes = [
  "/api/public",
  "/api/videos", // Permitir acesso aos vídeos para player e kiosk
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Verificar se é uma rota pública
  const isPublicRoute = publicRoutes.some((route) => pathname === route || pathname.startsWith(route));
  const isPublicApiRoute = publicApiRoutes.some((route) => pathname.startsWith(route));
  
  // Permitir acesso público a vídeos e thumbnails (para player e kiosk)
  // Formato: /api/videos/[id] ou /api/videos/[id]/thumbnail
  const isVideoRoute = /^\/api\/videos\/\d+(\/thumbnail)?$/.test(pathname);

  // Permitir rotas públicas
  if (isPublicRoute || isPublicApiRoute || isVideoRoute) {
    return NextResponse.next();
  }

  // Verificar se há token de autenticação (cookie)
  const token = request.cookies.get("auth-token")?.value;

  // Verificar formato básico do token (validação completa será feita nas rotas de API)
  if (token) {
    if (!hasValidTokenFormat(token)) {
      // Token com formato inválido
      const response = NextResponse.next();
      response.cookies.delete("auth-token");
      
      if (pathname.startsWith("/api/") && !isPublicApiRoute && !isVideoRoute) {
        return NextResponse.json(
          { error: "Token inválido" },
          { status: 401 }
        );
      }
      
      if (!isPublicRoute && !pathname.startsWith("/api/")) {
        const loginUrl = new URL("/", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
      }
      
      return response;
    }
    // Token tem formato válido, deixar passar (validação completa nas rotas de API)
  } else {
    // Se não houver token, verificar o que fazer
    // Se for uma rota de API (exceto públicas e vídeos), retornar erro 401
    if (pathname.startsWith("/api/") && !isPublicApiRoute && !isVideoRoute) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    // Se for uma página (exceto públicas), redirecionar para login
    if (!isPublicRoute && !pathname.startsWith("/api/")) {
      const loginUrl = new URL("/", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

// Configurar quais rotas o middleware deve executar
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

