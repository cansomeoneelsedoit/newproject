/**
 * Optional bearer-token guard for machine-to-machine API routes.
 * If API_TOKEN is unset, the guard is a no-op (open).
 */
export function checkApiToken(request: Request): { ok: true } | { ok: false; response: Response } {
  const token = process.env.API_TOKEN;
  if (!token) return { ok: true };

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${token}`) {
    return {
      ok: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true };
}
