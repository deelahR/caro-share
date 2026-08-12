import { changeOwnerPin, initializeDatabase } from "../../../../db/postgres";

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  try {
    await initializeDatabase();

    const payload = (await request.json()) as {
      owner?: string;
      currentPin?: string;
      newPin?: string;
    };
    const owner = await changeOwnerPin(
      cleanText(payload.owner),
      cleanText(payload.currentPin),
      cleanText(payload.newPin),
    );

    if (!owner) {
      return Response.json(
        { error: "Current PIN is not correct, or the new PIN is too short." },
        { status: 401 },
      );
    }

    return Response.json({ owner });
  } catch {
    return Response.json(
      { error: "PIN change is unavailable. Check the database connection." },
      { status: 503 },
    );
  }
}
