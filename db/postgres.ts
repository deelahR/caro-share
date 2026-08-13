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

export type EntryStatus = "pending" | "accepted";

export type BusinessEntry = {
  id: number;
  entryType: string;
  category: string;
  amount: number;
  quantity: string;
  ownerName: string;
  createdBy: string;
  entryDate: string;
  note: string;
  status: EntryStatus;
  approvalCount: number;
  approvedBy: string[];
  createdAt: string;
};

export type BusinessEntriesData = {
  categories: Record<string, string[]>;
  pending: BusinessEntry[];
  accepted: BusinessEntry[];
};

export type EquipmentStatus = "available" | "upcoming";

export type EquipmentItem = {
  id: number;
  name: string;
  status: EquipmentStatus;
  quantity: number;
  estimatedCost: number;
  targetDate: string;
  ownerName: string;
  createdBy: string;
  imageData: string;
  note: string;
  createdAt: string;
};

export type EquipmentData = {
  available: EquipmentItem[];
  upcoming: EquipmentItem[];
};

const initialOwners = [
  { name: "Anish", pin: "1111", recoveryCode: "ANISH-2026" },
  { name: "Anoup", pin: "2222", recoveryCode: "ANOUP-2026" },
  { name: "Shivam", pin: "3333", recoveryCode: "SHIVAM-2026" },
  { name: "Inben", pin: "4444", recoveryCode: "INBEN-2026" },
];

export const entryCategories: Record<string, string[]> = {
  investment: [
    "Owner capital",
    "Land contribution",
    "Equipment contribution",
    "Loan to business",
    "Other investment",
  ],
  expense: [
    "Seeds",
    "Fertilizer",
    "Pesticide",
    "Tools",
    "Equipment",
    "Land rent",
    "Water",
    "Electricity",
    "Labour",
    "Transport",
    "Fuel",
    "Vehicle repair",
    "Packaging",
    "Market fees",
    "Storage",
    "Phone and internet",
    "Admin fees",
    "Loan payment",
    "Other expense",
  ],
  sale: [
    "Vegetables",
    "Tomatoes",
    "Leafy greens",
    "Herbs",
    "Wholesale sale",
    "Market sale",
    "Direct customer sale",
    "Other sale",
  ],
};

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

function mapBusinessEntry(row: {
  id: string | number;
  entry_type: string;
  category: string;
  amount: string;
  quantity: string | null;
  owner_name: string;
  created_by: string;
  entry_date: string | Date;
  note: string | null;
  status: EntryStatus;
  approval_count: string | number;
  approved_by: string[] | null;
  created_at: Date;
}): BusinessEntry {
  return {
    id: Number(row.id),
    entryType: row.entry_type,
    category: row.category,
    amount: Number(row.amount),
    quantity: row.quantity || "",
    ownerName: row.owner_name,
    createdBy: row.created_by,
    entryDate:
      row.entry_date instanceof Date
        ? row.entry_date.toISOString().slice(0, 10)
        : row.entry_date,
    note: row.note || "",
    status: row.status,
    approvalCount: Number(row.approval_count),
    approvedBy: row.approved_by || [],
    createdAt: row.created_at.toISOString(),
  };
}

function mapEquipmentItem(row: {
  id: string | number;
  name: string;
  status: EquipmentStatus;
  quantity: string | number;
  estimated_cost: string;
  target_date: string | Date | null;
  owner_name: string;
  created_by: string;
  image_data: string | null;
  note: string | null;
  created_at: Date;
}): EquipmentItem {
  return {
    id: Number(row.id),
    name: row.name,
    status: row.status,
    quantity: Number(row.quantity),
    estimatedCost: Number(row.estimated_cost),
    targetDate:
      row.target_date instanceof Date
        ? row.target_date.toISOString().slice(0, 10)
        : row.target_date || "",
    ownerName: row.owner_name,
    createdBy: row.created_by,
    imageData: row.image_data || "",
    note: row.note || "",
    createdAt: row.created_at.toISOString(),
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
    await client.query(`
      create table if not exists business_entries (
        id bigserial primary key,
        entry_type text not null check (entry_type in ('investment', 'expense', 'sale')),
        category text not null,
        amount numeric(12, 2) not null check (amount >= 0),
        quantity text,
        owner_name text not null references owners(name),
        created_by text not null references owners(name),
        entry_date date not null,
        note text,
        status text not null default 'pending' check (status in ('pending', 'accepted')),
        accepted_at timestamptz,
        created_at timestamptz not null default now()
      )
    `);
    await client.query(`
      create table if not exists entry_approvals (
        id bigserial primary key,
        entry_id bigint not null references business_entries(id) on delete cascade,
        owner_name text not null references owners(name),
        created_at timestamptz not null default now(),
        unique (entry_id, owner_name)
      )
    `);
    await client.query(`
      create table if not exists equipment_items (
        id bigserial primary key,
        name text not null,
        status text not null check (status in ('available', 'upcoming')),
        quantity integer not null default 1 check (quantity > 0),
        estimated_cost numeric(12, 2) not null default 0 check (estimated_cost >= 0),
        target_date date,
        owner_name text not null references owners(name),
        created_by text not null references owners(name),
        image_data text,
        note text,
        created_at timestamptz not null default now()
      )
    `);
    await client.query("alter table equipment_items add column if not exists image_data text");
    await client.query(`
      insert into entry_approvals (entry_id, owner_name)
      select id, created_by
      from business_entries
      on conflict (entry_id, owner_name) do nothing
    `);
    await client.query(`
      update business_entries
      set status = 'accepted', accepted_at = coalesce(accepted_at, now())
      where status = 'pending'
        and (
          select count(*)
          from entry_approvals
          where entry_approvals.entry_id = business_entries.id
        ) >= 2
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

export async function listBusinessEntries(): Promise<BusinessEntriesData> {
  const result = await getPool().query<{
    id: string;
    entry_type: string;
    category: string;
    amount: string;
    quantity: string | null;
    owner_name: string;
    created_by: string;
    entry_date: string;
    note: string | null;
    status: EntryStatus;
    approval_count: string;
    approved_by: string[] | null;
    created_at: Date;
  }>(`
    select
      business_entries.id,
      business_entries.entry_type,
      business_entries.category,
      business_entries.amount,
      business_entries.quantity,
      business_entries.owner_name,
      business_entries.created_by,
      business_entries.entry_date,
      business_entries.note,
      business_entries.status,
      count(entry_approvals.id) as approval_count,
      coalesce(
        array_agg(entry_approvals.owner_name order by entry_approvals.created_at)
          filter (where entry_approvals.owner_name is not null),
        array[]::text[]
      ) as approved_by,
      business_entries.created_at
    from business_entries
    left join entry_approvals on entry_approvals.entry_id = business_entries.id
    group by business_entries.id
    order by business_entries.created_at desc
  `);
  const entries = result.rows.map(mapBusinessEntry);

  return {
    categories: entryCategories,
    pending: entries.filter((entry) => entry.status === "pending"),
    accepted: entries.filter((entry) => entry.status === "accepted"),
  };
}

export async function createBusinessEntry(entry: {
  entryType: string;
  category: string;
  amount: number;
  quantity: string;
  ownerName: string;
  createdBy: string;
  entryDate: string;
  note: string;
}) {
  if (
    !entryCategories[entry.entryType]?.includes(entry.category) ||
    !entry.ownerName ||
    !entry.createdBy ||
    !entry.entryDate ||
    !Number.isFinite(entry.amount) ||
    entry.amount <= 0
  ) {
    return null;
  }

  const result = await getPool().query<{ id: string }>(
    `
      insert into business_entries (
        entry_type,
        category,
        amount,
        quantity,
        owner_name,
        created_by,
        entry_date,
        note
      )
      values ($1, $2, $3, nullif($4, ''), $5, $6, $7, nullif($8, ''))
      returning id
    `,
    [
      entry.entryType,
      entry.category,
      entry.amount,
      entry.quantity,
      entry.ownerName,
      entry.createdBy,
      entry.entryDate,
      entry.note,
    ],
  );
  const entryId = Number(result.rows[0].id);

  await getPool().query(
    `
      insert into entry_approvals (entry_id, owner_name)
      values ($1, $2)
      on conflict (entry_id, owner_name) do nothing
    `,
    [entryId, entry.createdBy],
  );

  await getPool().query(
    "insert into app_events (owner_name, action) values ($1, $2)",
    [entry.createdBy, `Submitted ${entry.entryType} entry for approval`],
  );

  return { id: entryId, status: "pending" as const, approvalCount: 1 };
}

export async function approveBusinessEntry(entryId: number, ownerName: string) {
  if (!entryId || !ownerName) {
    return null;
  }

  const client = await getPool().connect();

  try {
    await client.query("begin");

    const entry = await client.query<{
      id: string;
      status: EntryStatus;
    }>(
      "select id, status from business_entries where id = $1 for update",
      [entryId],
    );

    if (!entry.rows[0] || entry.rows[0].status === "accepted") {
      await client.query("rollback");
      return null;
    }

    await client.query(
      `
        insert into entry_approvals (entry_id, owner_name)
        values ($1, $2)
        on conflict (entry_id, owner_name) do nothing
      `,
      [entryId, ownerName],
    );

    const approvals = await client.query<{ count: string }>(
      "select count(*) from entry_approvals where entry_id = $1",
      [entryId],
    );
    const approvalCount = Number(approvals.rows[0]?.count || 0);
    const status = approvalCount >= 2 ? "accepted" : "pending";

    if (status === "accepted") {
      await client.query(
        `
          update business_entries
          set status = 'accepted', accepted_at = now()
          where id = $1
        `,
        [entryId],
      );
    }

    await client.query(
      "insert into app_events (owner_name, action) values ($1, $2)",
      [ownerName, `Approved entry ${entryId}`],
    );
    await client.query("commit");

    return { id: entryId, status, approvalCount };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function listEquipment(): Promise<EquipmentData> {
  const result = await getPool().query<{
    id: string;
    name: string;
    status: EquipmentStatus;
    quantity: string;
    estimated_cost: string;
    target_date: string | null;
    owner_name: string;
    created_by: string;
    image_data: string | null;
    note: string | null;
    created_at: Date;
  }>(`
    select
      id,
      name,
      status,
      quantity,
      estimated_cost,
      target_date,
      owner_name,
      created_by,
      image_data,
      note,
      created_at
    from equipment_items
    order by created_at desc
  `);
  const equipment = result.rows.map(mapEquipmentItem);

  return {
    available: equipment.filter((item) => item.status === "available"),
    upcoming: equipment.filter((item) => item.status === "upcoming"),
  };
}

export async function createEquipmentItem(item: {
  name: string;
  status: string;
  quantity: number;
  estimatedCost: number;
  targetDate: string;
  ownerName: string;
  createdBy: string;
  imageData: string;
  note: string;
}) {
  if (
    !item.name ||
    !["available", "upcoming"].includes(item.status) ||
    !item.ownerName ||
    !item.createdBy ||
    !Number.isInteger(item.quantity) ||
    item.quantity <= 0 ||
    !Number.isFinite(item.estimatedCost) ||
    item.estimatedCost < 0
  ) {
    return null;
  }

  const result = await getPool().query<{ id: string }>(
    `
      insert into equipment_items (
        name,
        status,
        quantity,
        estimated_cost,
        target_date,
        owner_name,
        created_by,
        image_data,
        note
      )
      values ($1, $2, $3, $4, nullif($5, '')::date, $6, $7, nullif($8, ''), nullif($9, ''))
      returning id
    `,
    [
      item.name,
      item.status,
      item.quantity,
      item.estimatedCost,
      item.targetDate,
      item.ownerName,
      item.createdBy,
      item.imageData,
      item.note,
    ],
  );

  await getPool().query(
    "insert into app_events (owner_name, action) values ($1, $2)",
    [item.createdBy, `Added ${item.status} equipment item`],
  );

  return { id: Number(result.rows[0].id) };
}
