import { Pool } from "pg";

let pool: Pool | null = null;

export type DatabaseStatus = {
  configured: boolean;
  connected: boolean;
  initialized: boolean;
  databaseName?: string;
  ownerCount?: number;
  message: string;
};

const ownerNames = ["Anish", "Anoup", "Shivam", "Inben"];

function getDatabaseUrl() {
  return process.env.DATABASE_URL?.trim() || "";
}

function getPool() {
  const connectionString = getDatabaseUrl();

  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: connectionString.includes("localhost")
        ? false
        : { rejectUnauthorized: false },
    });
  }

  return pool;
}

export async function getDatabaseStatus(): Promise<DatabaseStatus> {
  if (!getDatabaseUrl()) {
    return {
      configured: false,
      connected: false,
      initialized: false,
      message: "Add a PostgreSQL DATABASE_URL in Render to connect storage.",
    };
  }

  try {
    const client = await getPool().connect();

    try {
      const database = await client.query<{ current_database: string }>(
        "select current_database()",
      );
      const tables = await client.query<{
        owners_table: string | null;
        events_table: string | null;
      }>(
        "select to_regclass('public.owners')::text as owners_table, to_regclass('public.app_events')::text as events_table",
      );
      const initialized = Boolean(
        tables.rows[0]?.owners_table && tables.rows[0]?.events_table,
      );
      const ownerCount = initialized
        ? await client.query<{ count: string }>("select count(*) from owners")
        : null;

      return {
        configured: true,
        connected: true,
        initialized,
        databaseName: database.rows[0]?.current_database,
        ownerCount: ownerCount ? Number(ownerCount.rows[0]?.count || 0) : 0,
        message: initialized
          ? "Database is connected and initialized."
          : "Database is connected. Initialize tables to start saving shared records.",
      };
    } finally {
      client.release();
    }
  } catch (error) {
    return {
      configured: true,
      connected: false,
      initialized: false,
      message: error instanceof Error ? error.message : "Database connection failed.",
    };
  }
}

export async function initializeDatabase() {
  const client = await getPool().connect();

  try {
    await client.query("begin");
    await client.query(`
      create table if not exists owners (
        id bigserial primary key,
        name text not null unique,
        created_at timestamptz not null default now()
      )
    `);
    await client.query(`
      create table if not exists app_events (
        id bigserial primary key,
        owner_name text not null references owners(name),
        action text not null,
        created_at timestamptz not null default now()
      )
    `);

    for (const name of ownerNames) {
      await client.query(
        "insert into owners (name) values ($1) on conflict (name) do nothing",
        [name],
      );
    }

    await client.query(
      "insert into app_events (owner_name, action) values ($1, $2)",
      ["Anish", "Initialized AgriBro database"],
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }

  return getDatabaseStatus();
}
