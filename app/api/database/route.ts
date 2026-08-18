import {
  cleanBusinessData,
  ensureDatabaseInitialized,
  getDatabaseStatus,
  initializeDatabase,
} from "../../../db/postgres";
import { getSessionOwner } from "../auth/owner-session";

export async function GET() {
  const status = await getDatabaseStatus();
  return Response.json(status);
}

export async function POST() {
  try {
    const status = await initializeDatabase();
    return Response.json(status, { status: 201 });
  } catch (error) {
    return Response.json(
      {
        configured: Boolean(process.env.DATABASE_URL),
        connected: false,
        initialized: false,
        message:
          error instanceof Error ? error.message : "Database initialization failed.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    await ensureDatabaseInitialized();

    const ownerName = getSessionOwner(request);

    if (!ownerName) {
      return Response.json(
        { error: "Owner session is required." },
        { status: 401 },
      );
    }

    if (ownerName !== "Anoup") {
      return Response.json(
        { error: "Only Anoup can clean business data." },
        { status: 403 },
      );
    }

    const payload = (await request.json().catch(() => ({}))) as {
      confirmation?: string;
    };

    if (payload.confirmation !== "CLEAN") {
      return Response.json(
        { error: "Type CLEAN to confirm business data cleanup." },
        { status: 400 },
      );
    }

    const cleanup = await cleanBusinessData();

    return Response.json({ cleanup });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Business data could not be cleaned.",
      },
      { status: 500 },
    );
  }
}
