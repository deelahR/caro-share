import {
  approveEquipmentAddRequest,
  createEquipmentAddRequest,
  initializeDatabase,
  listEquipment,
  requestEquipmentDeletion,
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
    const equipmentRequest = await createEquipmentAddRequest({
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

    if (!equipmentRequest) {
      return Response.json(
        { error: "Equipment details are incomplete or invalid." },
        { status: 400 },
      );
    }

    return Response.json({ equipmentRequest }, { status: 201 });
  } catch {
    return Response.json(
      { error: "Equipment request could not be saved. Check the database connection." },
      { status: 503 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    await initializeDatabase();

    const payload = (await request.json()) as {
      requestId?: string | number;
      ownerName?: string;
    };
    const addition = await approveEquipmentAddRequest(
      Number(payload.requestId),
      cleanText(payload.ownerName),
    );

    if (!addition) {
      return Response.json(
        { error: "Equipment addition request could not be found." },
        { status: 404 },
      );
    }

    return Response.json({ addition, equipment: await listEquipment() });
  } catch {
    return Response.json(
      { error: "Equipment addition could not be approved." },
      { status: 503 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    await initializeDatabase();

    const payload = (await request.json()) as {
      equipmentId?: string | number;
      ownerName?: string;
    };
    const deletion = await requestEquipmentDeletion(
      Number(payload.equipmentId),
      cleanText(payload.ownerName),
    );

    if (!deletion) {
      return Response.json(
        { error: "Equipment could not be found for deletion." },
        { status: 404 },
      );
    }

    return Response.json({ deletion, equipment: await listEquipment() });
  } catch {
    return Response.json(
      { error: "Equipment deletion could not be approved." },
      { status: 503 },
    );
  }
}
