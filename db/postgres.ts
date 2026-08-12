import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
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

const initialOwners = [
  { name: "Anish", pin: "1111" },
  { name: "Anoup", pin: "2222" },
  { name: "Shivam", pin: "3333" },
  { name: "Inben", pin: "4444" },
];

function hashPin(pin: string, salt = randomBytes(16).toString("hex")) {
  return {
    salt,
    hash: scryptSync(pin, salt, 64).toString("hex"),
  };
}

function verifyPin(pin: string, salt: string, expectedHash: string) {
  const attemptedHash = scryptSync(pin, salt, 64);
  const storedHash = Buffer.from(expectedHash, "hex");

  return (
    attemptedHash.length === storedHash.length &&
    timingSafeEqual(attemptedHash, storedHash)
  );
}

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
        pin_hash text,
        pin_salt text,
        created_at timestamptz not null default now()
      )
    `);
    await client.query("alter table owners add column if not exists pin_hash text");
    await client.query("alter table owners add column if not exists pin_salt text");
    await client.query(`
      create table if not exists app_events (
        id bigserial primary key,
        owner_name text not null references owners(name),
        action text not null,
        created_at timestamptz not null default now()
      )
    `);

    for (const owner of initialOwners) {
      const credentials = hashPin(owner.pin);
      await client.query(
        `
          insert into owners (name, pin_hash, pin_salt)
          values ($1, $2, $3)
          on conflict (name) do update
          set
            pin_hash = coalesce(owners.pin_hash, excluded.pin_hash),
            pin_salt = coalesce(owners.pin_salt, excluded.pin_salt)
        `,
        [owner.name, credentials.hash, credentials.salt],
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

export async function authenticateOwner(name: string, pin: string) {
  if (!name || !pin) {
    return null;
  }

  const result = await getPool().query<{
    name: string;
    pin_hash: string | null;
    pin_salt: string | null;
  }>(
    "select name, pin_hash, pin_salt from owners where lower(name) = lower($1)",
    [name],
  );
  const owner = result.rows[0];

  if (!owner?.pin_hash || !owner.pin_salt) {
    return null;
  }

  if (!verifyPin(pin, owner.pin_salt, owner.pin_hash)) {
    return null;
  }

  await getPool().query(
    "insert into app_events (owner_name, action) values ($1, $2)",
    [owner.name, "Owner logged in"],
  );

  return { name: owner.name };
}
