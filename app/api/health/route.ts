// Railway health check. Dynamic so a cached 200 never hides a dead server.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
