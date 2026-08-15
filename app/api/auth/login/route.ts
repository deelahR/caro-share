import { authenticateOwner, ensureDatabaseInitialized } from "../../../../db/postgres";
import { ownerSessionHeader } from "../owner-session";

export async function POST(request: Request) {
  try {
    await ensureDatabaseInitialized();

    const payload = (await request.json()) as {
      owner?: string;
      pin?: string;
    };
    const owner = await authenticateOwner(
      payload.owner?.trim() ?? "",
      payload.pin?.trim() ?? "",
    );

    if (!owner) {
      return Response.json(
        { error: "Owner name or PIN is not correct." },
        { status: 401 },
      );
    }

    return Response.json(
      { owner },
      { headers: { "Set-Cookie": ownerSessionHeader(owner.name) } },
    );
  } catch {
    return Response.json(
      { error: "Owner login is unavailable. Check the database connection." },
      { status: 503 },
    );
  }
}
