import {
  createBusinessEntry,
  initializeDatabase,
  listBusinessEntries,
} from "../../../db/postgres";

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET() {
  try {
    await initializeDatabase();

    return Response.json(await listBusinessEntries());
  } catch {
    return Response.json(
      { error: "Entries are unavailable. Check the database connection." },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  try {
    await initializeDatabase();

    const payload = (await request.json()) as {
      entryType?: string;
      category?: string;
      amount?: string | number;
      quantity?: string;
      ownerName?: string;
      createdBy?: string;
      entryDate?: string;
      note?: string;
    };
    const entry = await createBusinessEntry({
      entryType: cleanText(payload.entryType),
      category: cleanText(payload.category),
      amount: Number(payload.amount),
      quantity: cleanText(payload.quantity),
      ownerName: cleanText(payload.ownerName),
      createdBy: cleanText(payload.createdBy),
      entryDate: cleanText(payload.entryDate),
      note: cleanText(payload.note),
    });

    if (!entry) {
      return Response.json(
        { error: "Entry details are incomplete or invalid." },
        { status: 400 },
      );
    }

    return Response.json({ entry }, { status: 201 });
  } catch {
    return Response.json(
      { error: "Entry could not be saved. Check the database connection." },
      { status: 503 },
    );
  }
}
