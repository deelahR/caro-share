import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { Pool, type PoolClient } from "pg";

let pool: Pool | null = null;
let initializationPromise: Promise<DatabaseStatus> | null = null;

export type DatabaseStatus = {
  configured: boolean;
  connected: boolean;
  initialized: boolean;
  databaseName?: string;
  ownerCount?: number;
  message: string;
};

export type OwnerSummary = {
  ownerName: string;
  investment: number;
  expense: number;
  sale: number;
  assetValue: number;
  netContribution: number;
};

export type BusinessSummary = {
  approvalRequests: number;
  acceptedInvestmentRecords: number;
  acceptedAmount: number;
  totalDebit: number;
  totalCredit: number;
  netBalance: number;
  totalSales: number;
  totalExpenses: number;
  totalAssetValue: number;
  availableAssetValue: number;
  upcomingAssetValue: number;
  equipmentItems: number;
  ownerSummaries: OwnerSummary[];
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

export type OwnerNotification = {
  id: number;
  ownerName: string;
  tone: "success" | "error" | "info";
  message: string;
  isRead: boolean;
  createdAt: string;
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
  deletionRequestId: number | null;
  deletionApprovalCount: number;
  deletionApprovedBy: string[];
  createdAt: string;
};

export type EquipmentDeleteRequest = {
  id: number;
  equipmentId: number | null;
  itemName: string;
  requestedBy: string;
  approvalCount: number;
  approvedBy: string[];
  createdAt: string;
};

export type EquipmentAddRequest = {
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
  approvalCount: number;
  approvedBy: string[];
  createdAt: string;
};

export type EquipmentData = {
  available: EquipmentItem[];
  upcoming: EquipmentItem[];
  additionRequests: EquipmentAddRequest[];
  deletionRequests: EquipmentDeleteRequest[];
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
      max: 8,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
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

function mapOwnerNotification(row: {
  id: string | number;
  owner_name: string;
  tone: "success" | "error" | "info";
  message: string;
  is_read: boolean;
  created_at: Date;
}): OwnerNotification {
  return {
    id: Number(row.id),
    ownerName: row.owner_name,
    tone: row.tone,
    message: row.message,
    isRead: row.is_read,
    createdAt: row.created_at.toISOString(),
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

async function createOwnerNotification(
  queryable: Pool | PoolClient,
  ownerName: string,
  message: string,
  tone: OwnerNotification["tone"] = "info",
) {
  if (!ownerName || !message) {
    return;
  }

  await queryable.query(
    `
      insert into owner_notifications (owner_name, tone, message)
      values ($1, $2, $3)
      on conflict do nothing
    `,
    [ownerName, tone, message],
  );
}

async function createOtherOwnerNotifications(
  queryable: Pool | PoolClient,
  actorName: string,
  message: string,
  tone: OwnerNotification["tone"] = "info",
) {
  if (!actorName || !message) {
    return;
  }

  await queryable.query(
    `
      insert into owner_notifications (owner_name, tone, message)
      select name, $2, $3
      from owners
      where name <> $1
    `,
    [actorName, tone, message],
  );
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
  deletion_request_id?: string | number | null;
  deletion_approval_count?: string | number | null;
  deletion_approved_by?: string[] | null;
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
    deletionRequestId: row.deletion_request_id
      ? Number(row.deletion_request_id)
      : null,
    deletionApprovalCount: Number(row.deletion_approval_count || 0),
    deletionApprovedBy: row.deletion_approved_by || [],
    createdAt: row.created_at.toISOString(),
  };
}

function mapEquipmentDeleteRequest(row: {
  id: string | number;
  equipment_id: string | number | null;
  item_name: string;
  requested_by: string;
  approval_count: string | number;
  approved_by: string[] | null;
  created_at: Date;
}): EquipmentDeleteRequest {
  return {
    id: Number(row.id),
    equipmentId: row.equipment_id ? Number(row.equipment_id) : null,
    itemName: row.item_name,
    requestedBy: row.requested_by,
    approvalCount: Number(row.approval_count),
    approvedBy: row.approved_by || [],
    createdAt: row.created_at.toISOString(),
  };
}

function mapEquipmentAddRequest(row: {
  id: string | number;
  name: string;
  equipment_status: EquipmentStatus;
  quantity: string | number;
  estimated_cost: string;
  target_date: string | Date | null;
  owner_name: string;
  created_by: string;
  image_data: string | null;
  note: string | null;
  approval_count: string | number;
  approved_by: string[] | null;
  created_at: Date;
}): EquipmentAddRequest {
  return {
    id: Number(row.id),
    name: row.name,
    status: row.equipment_status,
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
    approvalCount: Number(row.approval_count),
    approvedBy: row.approved_by || [],
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
      create table if not exists owner_notifications (
        id bigserial primary key,
        owner_name text not null references owners(name) on delete cascade,
        tone text not null default 'info' check (tone in ('success', 'error', 'info')),
        message text not null,
        is_read boolean not null default false,
        created_at timestamptz not null default now()
      )
    `);
    await client.query(`
      create index if not exists owner_notifications_owner_created_idx
      on owner_notifications (owner_name, created_at desc)
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
      create table if not exists equipment_add_requests (
        id bigserial primary key,
        name text not null,
        equipment_status text not null check (equipment_status in ('available', 'upcoming')),
        quantity integer not null default 1 check (quantity > 0),
        estimated_cost numeric(12, 2) not null default 0 check (estimated_cost >= 0),
        target_date date,
        owner_name text not null references owners(name),
        created_by text not null references owners(name),
        image_data text,
        note text,
        status text not null default 'pending' check (status in ('pending', 'accepted')),
        accepted_at timestamptz,
        created_at timestamptz not null default now()
      )
    `);
    await client.query(`
      create table if not exists equipment_add_approvals (
        id bigserial primary key,
        request_id bigint not null references equipment_add_requests(id) on delete cascade,
        owner_name text not null references owners(name),
        created_at timestamptz not null default now(),
        unique (request_id, owner_name)
      )
    `);
    await client.query(`
      create table if not exists equipment_delete_requests (
        id bigserial primary key,
        equipment_id bigint references equipment_items(id) on delete set null,
        item_name text not null,
        requested_by text not null references owners(name),
        status text not null default 'pending' check (status in ('pending', 'accepted')),
        accepted_at timestamptz,
        created_at timestamptz not null default now()
      )
    `);
    await client.query(`
      create table if not exists equipment_delete_approvals (
        id bigserial primary key,
        request_id bigint not null references equipment_delete_requests(id) on delete cascade,
        owner_name text not null references owners(name),
        created_at timestamptz not null default now(),
        unique (request_id, owner_name)
      )
    `);
    await client.query(`
      create index if not exists owners_lower_name_idx
      on owners (lower(name))
    `);
    await client.query(`
      create index if not exists app_events_owner_created_idx
      on app_events (owner_name, created_at desc)
    `);
    await client.query(`
      create index if not exists business_entries_status_created_idx
      on business_entries (status, created_at desc)
    `);
    await client.query(`
      create index if not exists business_entries_accepted_owner_type_date_idx
      on business_entries (owner_name, entry_type, entry_date)
      where status = 'accepted'
    `);
    await client.query(`
      create index if not exists business_entries_pending_created_idx
      on business_entries (created_at desc)
      where status = 'pending'
    `);
    await client.query(`
      create index if not exists entry_approvals_entry_created_idx
      on entry_approvals (entry_id, created_at)
    `);
    await client.query(`
      create index if not exists entry_approvals_owner_created_idx
      on entry_approvals (owner_name, created_at desc)
    `);
    await client.query(`
      create index if not exists equipment_items_status_created_idx
      on equipment_items (status, created_at desc)
    `);
    await client.query(`
      create index if not exists equipment_items_owner_status_date_idx
      on equipment_items (owner_name, status, target_date)
    `);
    await client.query(`
      create index if not exists equipment_add_requests_status_created_idx
      on equipment_add_requests (status, created_at desc)
    `);
    await client.query(`
      create index if not exists equipment_add_approvals_request_created_idx
      on equipment_add_approvals (request_id, created_at)
    `);
    await client.query(`
      create index if not exists equipment_delete_requests_status_created_idx
      on equipment_delete_requests (status, created_at desc)
    `);
    await client.query(`
      create index if not exists equipment_delete_requests_equipment_status_idx
      on equipment_delete_requests (equipment_id, status)
    `);
    await client.query(`
      create index if not exists equipment_delete_approvals_request_created_idx
      on equipment_delete_approvals (request_id, created_at)
    `);
    await client.query(`
      create index if not exists owner_notifications_unread_idx
      on owner_notifications (owner_name, is_read, created_at desc)
    `);
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

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }

  return getDatabaseStatus();
}

export async function ensureDatabaseInitialized() {
  if (!initializationPromise) {
    initializationPromise = initializeDatabase().catch((error) => {
      initializationPromise = null;
      throw error;
    });
  }

  await initializationPromise;
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

export async function listOwnerNotifications(
  ownerName: string,
): Promise<OwnerNotification[]> {
  if (!ownerName) {
    return [];
  }

  const result = await getPool().query<{
    id: string;
    owner_name: string;
    tone: "success" | "error" | "info";
    message: string;
    is_read: boolean;
    created_at: Date;
  }>(
    `
      select id, owner_name, tone, message, is_read, created_at
      from owner_notifications
      where owner_name = $1
      order by created_at desc
      limit 30
    `,
    [ownerName],
  );

  return result.rows.map(mapOwnerNotification);
}

export async function markOwnerNotificationsRead(ownerName: string) {
  if (!ownerName) {
    return { updated: 0 };
  }

  const result = await getPool().query(
    "update owner_notifications set is_read = true where owner_name = $1 and is_read = false",
    [ownerName],
  );

  return { updated: result.rowCount || 0 };
}

export async function dismissOwnerNotification(
  ownerName: string,
  notificationId: number,
) {
  if (!ownerName || !notificationId) {
    return { deleted: 0 };
  }

  const result = await getPool().query(
    "delete from owner_notifications where owner_name = $1 and id = $2",
    [ownerName, notificationId],
  );

  return { deleted: result.rowCount || 0 };
}

export async function clearOwnerNotifications(ownerName: string) {
  if (!ownerName) {
    return { cleared: 0 };
  }

  const result = await getPool().query(
    "delete from owner_notifications where owner_name = $1",
    [ownerName],
  );

  return { cleared: result.rowCount || 0 };
}

export async function getBusinessSummary(): Promise<BusinessSummary> {
  const result = await getPool().query<{
    pending_entries: string;
    accepted_entries: string;
    accepted_amount: string | null;
    total_debit: string | null;
    total_credit: string | null;
    total_sales: string | null;
    total_expenses: string | null;
    total_asset_value: string | null;
    available_asset_value: string | null;
    upcoming_asset_value: string | null;
    equipment_items: string;
    equipment_add_requests: string;
    equipment_delete_requests: string;
  }>(`
    with entry_stats as (
      select
        count(*) filter (where status = 'pending') as pending_entries,
        count(*) filter (where status = 'accepted') as accepted_entries,
        coalesce(sum(amount) filter (where status = 'accepted'), 0) as accepted_amount,
        coalesce(sum(amount) filter (
          where status = 'accepted' and entry_type = 'expense'
        ), 0) as total_debit,
        coalesce(sum(amount) filter (
          where status = 'accepted' and entry_type in ('investment', 'sale')
        ), 0) as total_credit,
        coalesce(sum(amount) filter (
          where status = 'accepted' and entry_type = 'sale'
        ), 0) as total_sales,
        coalesce(sum(amount) filter (
          where status = 'accepted' and entry_type = 'expense'
        ), 0) as total_expenses
      from business_entries
    ),
    equipment_stats as (
      select
        coalesce(sum(estimated_cost), 0) as total_asset_value,
        coalesce(sum(estimated_cost) filter (where status = 'available'), 0) as available_asset_value,
        coalesce(sum(estimated_cost) filter (where status = 'upcoming'), 0) as upcoming_asset_value,
        count(*) as equipment_items
      from equipment_items
    ),
    approval_stats as (
      select
        (select count(*) from equipment_add_requests where status = 'pending') as equipment_add_requests,
        (select count(*) from equipment_delete_requests where status = 'pending') as equipment_delete_requests
    )
    select
      entry_stats.pending_entries,
      entry_stats.accepted_entries,
      entry_stats.accepted_amount,
      entry_stats.total_debit,
      entry_stats.total_credit,
      entry_stats.total_sales,
      entry_stats.total_expenses,
      equipment_stats.total_asset_value,
      equipment_stats.available_asset_value,
      equipment_stats.upcoming_asset_value,
      equipment_stats.equipment_items,
      approval_stats.equipment_add_requests,
      approval_stats.equipment_delete_requests
    from entry_stats
    cross join equipment_stats
    cross join approval_stats
  `);
  const ownerSummaryResult = await getPool().query<{
    owner_name: string;
    investment: string | null;
    expense: string | null;
    sale: string | null;
    asset_value: string | null;
  }>(`
    with entry_totals as (
      select
        owner_name,
        coalesce(sum(amount) filter (where entry_type = 'investment'), 0) as investment,
        coalesce(sum(amount) filter (where entry_type = 'expense'), 0) as expense,
        coalesce(sum(amount) filter (where entry_type = 'sale'), 0) as sale
      from business_entries
      where status = 'accepted'
      group by owner_name
    ),
    asset_totals as (
      select owner_name, coalesce(sum(estimated_cost), 0) as asset_value
      from equipment_items
      group by owner_name
    )
    select
      owners.name as owner_name,
      coalesce(entry_totals.investment, 0) as investment,
      coalesce(entry_totals.expense, 0) as expense,
      coalesce(entry_totals.sale, 0) as sale,
      coalesce(asset_totals.asset_value, 0) as asset_value
    from owners
    left join entry_totals on entry_totals.owner_name = owners.name
    left join asset_totals on asset_totals.owner_name = owners.name
    order by owners.name
  `);
  const summary = result.rows[0];
  const approvalRequests =
    Number(summary.pending_entries || 0) +
    Number(summary.equipment_add_requests || 0) +
    Number(summary.equipment_delete_requests || 0);
  const totalDebit = Number(summary.total_debit || 0);
  const totalCredit = Number(summary.total_credit || 0);
  const ownerSummaries = ownerSummaryResult.rows.map((row) => {
    const investment = Number(row.investment || 0);
    const expense = Number(row.expense || 0);
    const sale = Number(row.sale || 0);
    const assetValue = Number(row.asset_value || 0);

    return {
      ownerName: row.owner_name,
      investment,
      expense,
      sale,
      assetValue,
      netContribution: investment + sale + assetValue - expense,
    };
  });

  return {
    approvalRequests,
    acceptedInvestmentRecords: Number(summary.accepted_entries || 0),
    acceptedAmount: Number(summary.accepted_amount || 0),
    totalDebit,
    totalCredit,
    netBalance: totalCredit - totalDebit,
    totalSales: Number(summary.total_sales || 0),
    totalExpenses: Number(summary.total_expenses || 0),
    totalAssetValue: Number(summary.total_asset_value || 0),
    availableAssetValue: Number(summary.available_asset_value || 0),
    upcomingAssetValue: Number(summary.upcoming_asset_value || 0),
    equipmentItems: Number(summary.equipment_items || 0),
    ownerSummaries,
  };
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
  await createOtherOwnerNotifications(
    getPool(),
    entry.createdBy,
    `${entry.createdBy} submitted a ${entry.entryType} record for approval.`,
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
      entry_type: string;
      category: string;
      created_by: string;
      status: EntryStatus;
    }>(
      `
        select id, entry_type, category, created_by, status
        from business_entries
        where id = $1
        for update
      `,
      [entryId],
    );
    const activeEntry = entry.rows[0];

    if (!activeEntry || activeEntry.status === "accepted") {
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
    if (ownerName !== activeEntry.created_by) {
      await createOwnerNotification(
        client,
        activeEntry.created_by,
        `${ownerName} accepted your ${activeEntry.entry_type} record.`,
        status === "accepted" ? "success" : "info",
      );
    }
    if (status === "accepted") {
      await createOtherOwnerNotifications(
        client,
        ownerName,
        `${activeEntry.category} record was accepted and saved.`,
        "success",
      );
    }
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
    deletion_request_id: string | null;
    deletion_approval_count: string | null;
    deletion_approved_by: string[] | null;
    created_at: Date;
  }>(`
    select
      equipment_items.id,
      equipment_items.name,
      equipment_items.status,
      equipment_items.quantity,
      equipment_items.estimated_cost,
      equipment_items.target_date,
      equipment_items.owner_name,
      equipment_items.created_by,
      equipment_items.image_data,
      equipment_items.note,
      pending_delete.id as deletion_request_id,
      count(equipment_delete_approvals.id) as deletion_approval_count,
      coalesce(
        array_agg(equipment_delete_approvals.owner_name order by equipment_delete_approvals.created_at)
          filter (where equipment_delete_approvals.owner_name is not null),
        array[]::text[]
      ) as deletion_approved_by,
      equipment_items.created_at
    from equipment_items
    left join equipment_delete_requests as pending_delete
      on pending_delete.equipment_id = equipment_items.id
      and pending_delete.status = 'pending'
    left join equipment_delete_approvals
      on equipment_delete_approvals.request_id = pending_delete.id
    group by equipment_items.id, pending_delete.id
    order by equipment_items.created_at desc
  `);
  const deleteRequests = await getPool().query<{
    id: string;
    equipment_id: string | null;
    item_name: string;
    requested_by: string;
    approval_count: string;
    approved_by: string[] | null;
    created_at: Date;
  }>(`
    select
      equipment_delete_requests.id,
      equipment_delete_requests.equipment_id,
      equipment_delete_requests.item_name,
      equipment_delete_requests.requested_by,
      count(equipment_delete_approvals.id) as approval_count,
      coalesce(
        array_agg(equipment_delete_approvals.owner_name order by equipment_delete_approvals.created_at)
          filter (where equipment_delete_approvals.owner_name is not null),
        array[]::text[]
      ) as approved_by,
      equipment_delete_requests.created_at
    from equipment_delete_requests
    left join equipment_delete_approvals
      on equipment_delete_approvals.request_id = equipment_delete_requests.id
    where equipment_delete_requests.status = 'pending'
    group by equipment_delete_requests.id
    order by equipment_delete_requests.created_at desc
  `);
  const addRequests = await getPool().query<{
    id: string;
    name: string;
    equipment_status: EquipmentStatus;
    quantity: string;
    estimated_cost: string;
    target_date: string | null;
    owner_name: string;
    created_by: string;
    image_data: string | null;
    note: string | null;
    approval_count: string;
    approved_by: string[] | null;
    created_at: Date;
  }>(`
    select
      equipment_add_requests.id,
      equipment_add_requests.name,
      equipment_add_requests.equipment_status,
      equipment_add_requests.quantity,
      equipment_add_requests.estimated_cost,
      equipment_add_requests.target_date,
      equipment_add_requests.owner_name,
      equipment_add_requests.created_by,
      equipment_add_requests.image_data,
      equipment_add_requests.note,
      count(equipment_add_approvals.id) as approval_count,
      coalesce(
        array_agg(equipment_add_approvals.owner_name order by equipment_add_approvals.created_at)
          filter (where equipment_add_approvals.owner_name is not null),
        array[]::text[]
      ) as approved_by,
      equipment_add_requests.created_at
    from equipment_add_requests
    left join equipment_add_approvals
      on equipment_add_approvals.request_id = equipment_add_requests.id
    where equipment_add_requests.status = 'pending'
    group by equipment_add_requests.id
    order by equipment_add_requests.created_at desc
  `);
  const equipment = result.rows.map(mapEquipmentItem);

  return {
    available: equipment.filter((item) => item.status === "available"),
    upcoming: equipment.filter((item) => item.status === "upcoming"),
    additionRequests: addRequests.rows.map(mapEquipmentAddRequest),
    deletionRequests: deleteRequests.rows.map(mapEquipmentDeleteRequest),
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

function isValidEquipmentRequest(item: {
  name: string;
  status: string;
  quantity: number;
  estimatedCost: number;
  ownerName: string;
  createdBy: string;
}) {
  return (
    item.name &&
    ["available", "upcoming"].includes(item.status) &&
    item.ownerName &&
    item.createdBy &&
    Number.isInteger(item.quantity) &&
    item.quantity > 0 &&
    Number.isFinite(item.estimatedCost) &&
    item.estimatedCost >= 0
  );
}

export async function createEquipmentAddRequest(item: {
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
  if (!isValidEquipmentRequest(item)) {
    return null;
  }

  const result = await getPool().query<{ id: string }>(
    `
      insert into equipment_add_requests (
        name,
        equipment_status,
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
  const requestId = Number(result.rows[0].id);

  await getPool().query(
    `
      insert into equipment_add_approvals (request_id, owner_name)
      values ($1, $2)
      on conflict (request_id, owner_name) do nothing
    `,
    [requestId, item.createdBy],
  );

  await getPool().query(
    "insert into app_events (owner_name, action) values ($1, $2)",
    [item.createdBy, `Submitted ${item.status} equipment for approval`],
  );
  await createOtherOwnerNotifications(
    getPool(),
    item.createdBy,
    `${item.createdBy} requested approval to add ${item.name}.`,
  );

  return { id: requestId, status: "pending" as const, approvalCount: 1 };
}

export async function approveEquipmentAddRequest(
  requestId: number,
  ownerName: string,
) {
  if (!requestId || !ownerName) {
    return null;
  }

  const client = await getPool().connect();

  try {
    await client.query("begin");

    const request = await client.query<{
      id: string;
      name: string;
      equipment_status: EquipmentStatus;
      quantity: string;
      estimated_cost: string;
      target_date: string | null;
      owner_name: string;
      created_by: string;
      image_data: string | null;
      note: string | null;
      status: "pending" | "accepted";
    }>(
      `
        select
          id,
          name,
          equipment_status,
          quantity,
          estimated_cost,
          target_date,
          owner_name,
          created_by,
          image_data,
          note,
          status
        from equipment_add_requests
        where id = $1
        for update
      `,
      [requestId],
    );
    const item = request.rows[0];

    if (!item || item.status === "accepted") {
      await client.query("rollback");
      return null;
    }

    await client.query(
      `
        insert into equipment_add_approvals (request_id, owner_name)
        values ($1, $2)
        on conflict (request_id, owner_name) do nothing
      `,
      [requestId, ownerName],
    );

    const approvals = await client.query<{ count: string }>(
      "select count(*) from equipment_add_approvals where request_id = $1",
      [requestId],
    );
    const approvalCount = Number(approvals.rows[0]?.count || 0);
    const status = approvalCount >= 2 ? "accepted" : "pending";
    let equipmentId: number | null = null;

    if (status === "accepted") {
      const equipment = await client.query<{ id: string }>(
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
          values ($1, $2, $3, $4, $5, $6, $7, nullif($8, ''), nullif($9, ''))
          returning id
        `,
        [
          item.name,
          item.equipment_status,
          Number(item.quantity),
          Number(item.estimated_cost),
          item.target_date,
          item.owner_name,
          item.created_by,
          item.image_data || "",
          item.note || "",
        ],
      );
      equipmentId = Number(equipment.rows[0].id);
      await client.query(
        `
          update equipment_add_requests
          set status = 'accepted', accepted_at = now()
          where id = $1
        `,
        [requestId],
      );
    }

    await client.query(
      "insert into app_events (owner_name, action) values ($1, $2)",
      [ownerName, `Approved equipment addition ${requestId}`],
    );
    if (ownerName !== item.created_by) {
      await createOwnerNotification(
        client,
        item.created_by,
        `${ownerName} accepted your equipment request for ${item.name}.`,
        status === "accepted" ? "success" : "info",
      );
    }
    if (status === "accepted") {
      await createOtherOwnerNotifications(
        client,
        ownerName,
        `${item.name} was approved and added to equipment.`,
        "success",
      );
    }
    await client.query("commit");

    return { id: requestId, equipmentId, status, approvalCount };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function requestEquipmentDeletion(
  equipmentId: number,
  ownerName: string,
) {
  if (!equipmentId || !ownerName) {
    return null;
  }

  const client = await getPool().connect();

  try {
    await client.query("begin");

    const equipment = await client.query<{
      id: string;
      name: string;
    }>("select id, name from equipment_items where id = $1 for update", [
      equipmentId,
    ]);
    const item = equipment.rows[0];

    if (!item) {
      await client.query("rollback");
      return null;
    }

    const existingRequest = await client.query<{ id: string }>(
      `
        select id
        from equipment_delete_requests
        where equipment_id = $1 and status = 'pending'
        for update
      `,
      [equipmentId],
    );
    let requestId = Number(existingRequest.rows[0]?.id || 0);

    if (!requestId) {
      const createdRequest = await client.query<{ id: string }>(
        `
          insert into equipment_delete_requests (
            equipment_id,
            item_name,
            requested_by
          )
          values ($1, $2, $3)
          returning id
        `,
        [equipmentId, item.name, ownerName],
      );
      requestId = Number(createdRequest.rows[0].id);
      await createOtherOwnerNotifications(
        client,
        ownerName,
        `${ownerName} requested approval to remove ${item.name}.`,
      );
    }

    await client.query(
      `
        insert into equipment_delete_approvals (request_id, owner_name)
        values ($1, $2)
        on conflict (request_id, owner_name) do nothing
      `,
      [requestId, ownerName],
    );

    const approvals = await client.query<{ count: string }>(
      "select count(*) from equipment_delete_approvals where request_id = $1",
      [requestId],
    );
    const approvalCount = Number(approvals.rows[0]?.count || 0);
    const status = approvalCount >= 2 ? "deleted" : "pending";

    if (status === "deleted") {
      await client.query(
        `
          update equipment_delete_requests
          set status = 'accepted', accepted_at = now()
          where id = $1
        `,
        [requestId],
      );
      await client.query("delete from equipment_items where id = $1", [
        equipmentId,
      ]);
    }

    await client.query(
      "insert into app_events (owner_name, action) values ($1, $2)",
      [ownerName, `Approved equipment deletion ${equipmentId}`],
    );
    if (status === "deleted") {
      await createOtherOwnerNotifications(
        client,
        ownerName,
        `${item.name} was approved for removal and deleted from equipment.`,
        "success",
      );
    }
    await client.query("commit");

    return { id: requestId, equipmentId, status, approvalCount };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
