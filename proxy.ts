import { NextResponse } from "next/server";

import { auth } from "@/auth";

const protectedPrefixes = ["/player", "/dashboard"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (isProtected && !req.auth) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }
});

export const config = {
  matcher: ["/player/:path*", "/dashboard/:path*"],
};
