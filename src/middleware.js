import { NextResponse } from "next/server";

export const config = {
  matcher: "/integrations/:path*",
};

export function middleware(request) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-createxyz-project-id", "71913995-231c-4dae-862c-29956dd007e1");
  requestHeaders.set("x-createxyz-project-group-id", "4d5ca65e-7b1a-4840-969a-cf4dd06b3f4b");


  request.nextUrl.href = `https://www.create.xyz/${request.nextUrl.pathname}`;

  return NextResponse.rewrite(request.nextUrl, {
    request: {
      headers: requestHeaders,
    },
  });
}