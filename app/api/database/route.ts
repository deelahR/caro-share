import { getDatabaseStatus, initializeDatabase } from "../../../db/postgres";

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
