import {
  ensureDatabaseInitialized,
  getBusinessSummary,
} from "../../../db/postgres";

export async function GET() {
  try {
    await ensureDatabaseInitialized();

    return Response.json(await getBusinessSummary());
  } catch {
    return Response.json(
      { error: "Summary is unavailable. Check the database connection." },
      { status: 503 },
    );
  }
}
