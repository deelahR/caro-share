import {
  clearOwnerNotifications,
  dismissOwnerNotification,
  initializeDatabase,
  listOwnerNotifications,
  markOwnerNotificationsRead,
} from "../../../db/postgres";
import { getSessionOwner } from "../auth/owner-session";

export async function GET(request: Request) {
  try {
    await initializeDatabase();

    const ownerName = getSessionOwner(request);

    if (!ownerName) {
      return Response.json(
        { error: "Owner session is required." },
        { status: 401 },
      );
    }

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

export async function PATCH(request: Request) {
  try {
    await initializeDatabase();

    const ownerName = getSessionOwner(request);

    if (!ownerName) {
      return Response.json(
        { error: "Owner session is required." },
        { status: 401 },
      );
    }

    return Response.json(await markOwnerNotificationsRead(ownerName));
  } catch {
    return Response.json(
      { error: "Notifications could not be updated." },
      { status: 503 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    await initializeDatabase();

    const ownerName = getSessionOwner(request);

    if (!ownerName) {
      return Response.json(
        { error: "Owner session is required." },
        { status: 401 },
      );
    }

    const payload = (await request.json().catch(() => ({}))) as {
      notificationId?: string | number;
    };
    const result = payload.notificationId
      ? await dismissOwnerNotification(ownerName, Number(payload.notificationId))
      : await clearOwnerNotifications(ownerName);

    return Response.json(result);
  } catch {
    return Response.json(
      { error: "Notifications could not be cleared." },
      { status: 503 },
    );
  }
}
