import {
  createEquipmentItem,
  initializeDatabase,
  listEquipment,
} from "../../../db/postgres";

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET() {
  try {
    await initializeDatabase();

    return Response.json(await listEquipment());
  } catch {
    return Response.json(
      { error: "Equipment is unavailable. Check the database connection." },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  try {
    await initializeDatabase();

    const payload = (await request.json()) as {
      name?: string;
      status?: string;
      quantity?: string | number;
      estimatedCost?: string | number;
      targetDate?: string;
      ownerName?: string;
      createdBy?: string;
      imageData?: string;
      note?: string;
    };
    const equipment = await createEquipmentItem({
      name: cleanText(payload.name),
      status: cleanText(payload.status),
      quantity: Number(payload.quantity),
      estimatedCost: Number(payload.estimatedCost || 0),
      targetDate: cleanText(payload.targetDate),
      ownerName: cleanText(payload.ownerName),
      createdBy: cleanText(payload.createdBy),
      imageData: cleanText(payload.imageData),
      note: cleanText(payload.note),
    });

    if (!equipment) {
      return Response.json(
        { error: "Equipment details are incomplete or invalid." },
        { status: 400 },
      );
    }

    return Response.json({ equipment }, { status: 201 });
  } catch {
    return Response.json(
      { error: "Equipment could not be saved. Check the database connection." },
      { status: 503 },
    );
  }
}
