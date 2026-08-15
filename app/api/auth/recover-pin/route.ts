import { ensureDatabaseInitialized, recoverOwnerPin } from "../../../../db/postgres";

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  try {
    await ensureDatabaseInitialized();

    const payload = (await request.json()) as {
      owner?: string;
      recoveryCode?: string;
      newPin?: string;
    };
    const owner = await recoverOwnerPin(
      cleanText(payload.owner),
      cleanText(payload.recoveryCode),
      cleanText(payload.newPin),
    );

    if (!owner) {
      return Response.json(
        { error: "Recovery code is not correct, or the new PIN is too short." },
        { status: 401 },
      );
    }

    return Response.json({ owner });
  } catch {
    return Response.json(
      { error: "PIN recovery is unavailable. Check the database connection." },
      { status: 503 },
    );
  }
}
