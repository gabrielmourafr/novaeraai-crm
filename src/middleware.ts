import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/login"];

// Papel "developer": acesso restrito à área de Entrega (Projetos e Documentos)
// + Tarefas, porque é pra lá que o email de "nova tarefa" aponta. Em /tasks
// o developer só enxerga as tarefas atribuídas a ele (filtro na página).
const DEVELOPER_ALLOWED_PREFIXES = ["/projects", "/documents", "/tasks"];
const DEVELOPER_HOME = "/projects";

function isPublicRoute(pathname: string) {
  if (PUBLIC_ROUTES.includes(pathname)) return true;
  // Proposal public page
  if (pathname.match(/^\/proposals\/[^/]+\/public$/)) return true;
  return false;
}

function isAllowedForDeveloper(pathname: string) {
  return DEVELOPER_ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !isPublicRoute(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user) {
    const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
    const isDeveloper = profile?.role === "developer";

    if (PUBLIC_ROUTES.includes(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = isDeveloper ? DEVELOPER_HOME : "/dashboard";
      return NextResponse.redirect(url);
    }

    if (isDeveloper && !isAllowedForDeveloper(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = DEVELOPER_HOME;
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
