import {
  approveBusinessEntry,
  initializeDatabase,
  listBusinessEntries,
} from "../../../../db/postgres";

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  try {
    await initializeDatabase();

    const payload = (await request.json()) as {
      entryId?: string | number;
      ownerName?: string;
    };
    const approval = await approveBusinessEntry(
      Number(payload.entryId),
      cleanText(payload.ownerName),
    );

    if (!approval) {
      return Response.json(
        { error: "Entry was already accepted or could not be approved." },
        { status: 400 },
      );
    }

    return Response.json({ approval, entries: await listBusinessEntries() });
  } catch {
    return Response.json(
      { error: "Approval could not be saved. Check the database connection." },
      { status: 503 },
    );
  }
}
