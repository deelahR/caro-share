import {
  getOwnerProfile,
  ensureDatabaseInitialized,
  updateOwnerProfile,
} from "../../../../db/postgres";

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(request: Request) {
  try {
    await ensureDatabaseInitialized();

    const url = new URL(request.url);
    const owner = cleanText(url.searchParams.get("owner"));
    const profile = await getOwnerProfile(owner);

    if (!profile) {
      return Response.json({ error: "Owner profile was not found." }, { status: 404 });
    }

    return Response.json({ profile });
  } catch {
    return Response.json(
      { error: "Owner profile is unavailable. Check the database connection." },
      { status: 503 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    await ensureDatabaseInitialized();

    const payload = (await request.json()) as {
      owner?: string;
      displayName?: string;
      phone?: string;
      email?: string;
    };
    const profile = await updateOwnerProfile(cleanText(payload.owner), {
      displayName: cleanText(payload.displayName),
      phone: cleanText(payload.phone),
      email: cleanText(payload.email),
    });

    if (!profile) {
      return Response.json({ error: "Owner profile was not found." }, { status: 404 });
    }

    return Response.json({ profile });
  } catch {
    return Response.json(
      { error: "Owner profile could not be saved. Check the database connection." },
      { status: 503 },
    );
  }
}
