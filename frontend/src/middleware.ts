import { NextResponse, type NextRequest } from "next/server";

const ACCESS_COOKIE = "access_token";

/**
 * Redireciona visitantes sem cookie de sessão para a landing com o pop-up de login aberto.
 * É só conveniência de navegação: a autorização real (papel, posse de dados) é SEMPRE do backend.
 */
export function middleware(request: NextRequest) {
  if (request.cookies.has(ACCESS_COOKIE)) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = "/";
  url.search = "?login=1";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/painel/:path*",
    "/prestadores/:path*",
    "/pontos-e-cupons/:path*",
    "/dependentes/:path*",
    "/documentos/:path*",
    "/admin/:path*",
  ],
};
