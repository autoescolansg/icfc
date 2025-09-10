// netlify/functions/utils/authGuard.mjs
import jwt from "jsonwebtoken";

export function requireAuth(event) {
  const auth =
    event.headers?.authorization ||
    event.headers?.Authorization ||
    "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) throw new Error("Missing bearer token");

  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) throw new Error("Missing SUPABASE_JWT_SECRET env");

  const payload = jwt.verify(token, secret, { algorithms: ["HS256"] });
  return {
    userId: payload.sub,
    email: payload.email,
    role: payload.role || payload.user_role || "authenticated",
    raw: payload,
  };
}