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

export type OwnerProfile = {
  name: string;
  displayName: string;
  role: string;
  phone: string;
  email: string;
  createdAt: string;
  updatedAt: string;
};

const initialOwners = [
  { name: "Anish", pin: "1111", recoveryCode: "ANISH-2026" },
  { name: "Anoup", pin: "2222", recoveryCode: "ANOUP-2026" },
  { name: "Shivam", pin: "3333", recoveryCode: "SHIVAM-2026" },
  { name: "Inben", pin: "4444", recoveryCode: "INBEN-2026" },
];

function hashSecret(secret: string, salt = randomBytes(16).toString("hex")) {
  return {
    salt,
    hash: scryptSync(secret, salt, 64).toString("hex"),
  };
}

function verifySecret(secret: string, salt: string, expectedHash: string) {
  const attemptedHash = scryptSync(secret, salt, 64);
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

function mapOwnerProfile(row: {
  name: string;
  display_name: string | null;
  role: string | null;
  phone: string | null;
  email: string | null;
  created_at: Date;
  updated_at: Date;
}): OwnerProfile {
  return {
    name: row.name,
    displayName: row.display_name || row.name,
    role: row.role || "Owner",
    phone: row.phone || "",
    email: row.email || "",
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
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
        display_name text,
        role text not null default 'Owner',
        phone text,
        email text,
        pin_hash text,
        pin_salt text,
        recovery_hash text,
        recovery_salt text,
        updated_at timestamptz not null default now(),
        created_at timestamptz not null default now()
      )
    `);
    await client.query("alter table owners add column if not exists display_name text");
    await client.query(
      "alter table owners add column if not exists role text not null default 'Owner'",
    );
    await client.query("alter table owners add column if not exists phone text");
    await client.query("alter table owners add column if not exists email text");
    await client.query("alter table owners add column if not exists pin_hash text");
    await client.query("alter table owners add column if not exists pin_salt text");
    await client.query("alter table owners add column if not exists recovery_hash text");
    await client.query("alter table owners add column if not exists recovery_salt text");
    await client.query(
      "alter table owners add column if not exists updated_at timestamptz not null default now()",
    );
    await client.query(`
      create table if not exists app_events (
        id bigserial primary key,
        owner_name text not null references owners(name),
        action text not null,
        created_at timestamptz not null default now()
      )
    `);

    for (const owner of initialOwners) {
      const credentials = hashSecret(owner.pin);
      const recovery = hashSecret(owner.recoveryCode);
      await client.query(
        `
          insert into owners (
            name,
            display_name,
            role,
            pin_hash,
            pin_salt,
            recovery_hash,
            recovery_salt
          )
          values ($1, $2, 'Owner', $3, $4, $5, $6)
          on conflict (name) do update
          set
            display_name = coalesce(owners.display_name, excluded.display_name),
            role = coalesce(owners.role, excluded.role),
            pin_hash = coalesce(owners.pin_hash, excluded.pin_hash),
            pin_salt = coalesce(owners.pin_salt, excluded.pin_salt),
            recovery_hash = coalesce(owners.recovery_hash, excluded.recovery_hash),
            recovery_salt = coalesce(owners.recovery_salt, excluded.recovery_salt),
            updated_at = now()
        `,
        [
          owner.name,
          owner.name,
          credentials.hash,
          credentials.salt,
          recovery.hash,
          recovery.salt,
        ],
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

  if (!verifySecret(pin, owner.pin_salt, owner.pin_hash)) {
    return null;
  }

  await getPool().query(
    "insert into app_events (owner_name, action) values ($1, $2)",
    [owner.name, "Owner logged in"],
  );

  return { name: owner.name };
}

export async function getOwnerProfile(name: string) {
  if (!name) {
    return null;
  }

  const result = await getPool().query<{
    name: string;
    display_name: string | null;
    role: string | null;
    phone: string | null;
    email: string | null;
    created_at: Date;
    updated_at: Date;
  }>(
    `
      select name, display_name, role, phone, email, created_at, updated_at
      from owners
      where lower(name) = lower($1)
    `,
    [name],
  );
  const owner = result.rows[0];

  return owner ? mapOwnerProfile(owner) : null;
}

export async function updateOwnerProfile(
  name: string,
  profile: { displayName: string; phone: string; email: string },
) {
  if (!name) {
    return null;
  }

  const result = await getPool().query<{
    name: string;
    display_name: string | null;
    role: string | null;
    phone: string | null;
    email: string | null;
    created_at: Date;
    updated_at: Date;
  }>(
    `
      update owners
      set
        display_name = nullif($2, ''),
        phone = nullif($3, ''),
        email = nullif($4, ''),
        updated_at = now()
      where lower(name) = lower($1)
      returning name, display_name, role, phone, email, created_at, updated_at
    `,
    [name, profile.displayName, profile.phone, profile.email],
  );
  const owner = result.rows[0];

  if (!owner) {
    return null;
  }

  await getPool().query(
    "insert into app_events (owner_name, action) values ($1, $2)",
    [owner.name, "Owner profile updated"],
  );

  return mapOwnerProfile(owner);
}

export async function changeOwnerPin(
  name: string,
  currentPin: string,
  newPin: string,
) {
  const owner = await authenticateOwner(name, currentPin);

  if (!owner || newPin.length < 4) {
    return null;
  }

  const credentials = hashSecret(newPin);

  await getPool().query(
    `
      update owners
      set pin_hash = $2, pin_salt = $3, updated_at = now()
      where name = $1
    `,
    [owner.name, credentials.hash, credentials.salt],
  );
  await getPool().query(
    "insert into app_events (owner_name, action) values ($1, $2)",
    [owner.name, "Owner PIN changed"],
  );

  return { name: owner.name };
}

export async function recoverOwnerPin(
  name: string,
  recoveryCode: string,
  newPin: string,
) {
  if (!name || !recoveryCode || newPin.length < 4) {
    return null;
  }

  const result = await getPool().query<{
    name: string;
    recovery_hash: string | null;
    recovery_salt: string | null;
  }>(
    `
      select name, recovery_hash, recovery_salt
      from owners
      where lower(name) = lower($1)
    `,
    [name],
  );
  const owner = result.rows[0];

  if (!owner?.recovery_hash || !owner.recovery_salt) {
    return null;
  }

  if (!verifySecret(recoveryCode, owner.recovery_salt, owner.recovery_hash)) {
    return null;
  }

  const credentials = hashSecret(newPin);

  await getPool().query(
    `
      update owners
      set pin_hash = $2, pin_salt = $3, updated_at = now()
      where name = $1
    `,
    [owner.name, credentials.hash, credentials.salt],
  );
  await getPool().query(
    "insert into app_events (owner_name, action) values ($1, $2)",
    [owner.name, "Owner PIN recovered"],
  );

  return { name: owner.name };
}
