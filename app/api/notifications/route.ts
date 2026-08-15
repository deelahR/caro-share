import {
  clearOwnerNotifications,
  initializeDatabase,
  listOwnerNotifications,
} from "../../../db/postgres";

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(request: Request) {
  try {
    await initializeDatabase();

    const url = new URL(request.url);
    const ownerName = cleanText(url.searchParams.get("owner"));

    return Response.json({
      notifications: await listOwnerNotifications(ownerName),
    });
  } catch {
    return Response.json(
      { error: "Notifications could not be loaded." },
      { status: 503 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    await initializeDatabase();

    const payload = (await request.json()) as { ownerName?: string };
    const result = await clearOwnerNotifications(cleanText(payload.ownerName));

    return Response.json(result);
  } catch {
    return Response.json(
      { error: "Notifications could not be cleared." },
      { status: 503 },
    );
  }
}
