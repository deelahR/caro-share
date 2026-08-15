import { clearOwnerSessionHeader } from "../owner-session";

export async function POST() {
  return Response.json(
    { ok: true },
    { headers: { "Set-Cookie": clearOwnerSessionHeader() } },
  );
}
