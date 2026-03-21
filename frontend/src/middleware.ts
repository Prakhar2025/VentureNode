/**
 * VentureNode — Clerk Authentication Middleware.
 *
 * Protects all routes under /dashboard (and any future protected segments)
 * using Clerk's clerkMiddleware. The sign-in and sign-up routes are public.
 * Everything else that is not explicitly public requires an authenticated session.
 */

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Routes that do NOT require authentication
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/health",
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
