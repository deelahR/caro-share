"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Owner = {
  name: string;
};

type OwnerProfile = {
  name: string;
  displayName: string;
  role: string;
  phone: string;
  email: string;
  createdAt: string;
  updatedAt: string;
};

type DatabaseStatus = {
  configured: boolean;
  connected: boolean;
  initialized: boolean;
  databaseName?: string;
  ownerCount?: number;
  message: string;
};

type Notification = {
  id: number;
  tone: "success" | "error";
  message: string;
};

type BusinessEntry = {
  id: number;
  entryType: string;
  category: string;
  amount: number;
  quantity: string;
  ownerName: string;
  createdBy: string;
  entryDate: string;
  note: string;
  status: "pending" | "accepted";
  approvalCount: number;
  approvedBy: string[];
  createdAt: string;
};

type EntriesData = {
  categories: Record<string, string[]>;
  pending: BusinessEntry[];
  accepted: BusinessEntry[];
};

const owners: Owner[] = [
  { name: "Anish" },
  { name: "Anoup" },
  { name: "Shivam" },
  { name: "Inben" },
];

const entryTypeLabels: Record<string, string> = {
  investment: "Investment",
  expense: "Expense",
  sale: "Sale",
};

const ownerSessionKey = "agribro-owner-session";

function readText(form: FormData, key: string) {
  return String(form.get(key) || "").trim();
}

export default function Home() {
  const [activeOwner, setActiveOwner] = useState("");
  const [ownerProfile, setOwnerProfile] = useState<OwnerProfile | null>(null);
  const [databaseStatus, setDatabaseStatus] = useState<DatabaseStatus | null>(
    null,
  );
  const [isCheckingDatabase, setIsCheckingDatabase] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [securityMessage, setSecurityMessage] = useState("");
  const [recoveryMessage, setRecoveryMessage] = useState("");
  const [notification, setNotification] = useState<Notification | null>(null);
  const [entriesData, setEntriesData] = useState<EntriesData | null>(null);
  const [selectedEntryType, setSelectedEntryType] = useState("expense");
  const [isSavingEntry, setIsSavingEntry] = useState(false);
  const [isApprovingEntry, setIsApprovingEntry] = useState<number | null>(null);

  const showNotification = useCallback(
    (tone: Notification["tone"], message: string) => {
    const id = Date.now();

    setNotification({ id, tone, message });
    window.setTimeout(() => {
      setNotification((current) => (current?.id === id ? null : current));
    }, 5000);
    },
    [],
  );

  useEffect(() => {
    const savedOwner = window.localStorage.getItem(ownerSessionKey);

    if (savedOwner && owners.some((owner) => owner.name === savedOwner)) {
      queueMicrotask(() => setActiveOwner(savedOwner));
    }
  }, []);

  async function loadOwnerProfile(ownerName: string) {
    const response = await fetch(
      `/api/owners/profile?owner=${encodeURIComponent(ownerName)}`,
    );
    const payload = (await response.json()) as {
      profile?: OwnerProfile;
      error?: string;
    };

    if (!response.ok || !payload.profile) {
      setProfileMessage(payload.error || "Owner profile could not be loaded.");
      return;
    }

    setOwnerProfile(payload.profile);
  }

  const loadEntries = useCallback(async () => {
    const response = await fetch("/api/entries");
    const payload = (await response.json()) as EntriesData & { error?: string };

    if (!response.ok) {
      showNotification("error", payload.error || "Entries could not be loaded.");
      return;
    }

    setEntriesData(payload);
  }, [showNotification]);

  async function loginOwner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const ownerName = readText(form, "owner");
    const pin = readText(form, "pin");
    setLoginError("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner: ownerName, pin }),
    });
    const payload = (await response.json()) as {
      owner?: Owner;
      error?: string;
    };

    if (!response.ok || !payload.owner) {
      setLoginError(payload.error || "Owner name or PIN is not correct.");
      showNotification(
        "error",
        payload.error || "Owner name or PIN is not correct.",
      );
      return;
    }

    window.localStorage.setItem(ownerSessionKey, payload.owner.name);
    setActiveOwner(payload.owner.name);
    setLoginError("");
    showNotification("success", `Welcome, ${payload.owner.name}.`);
    event.currentTarget.reset();
  }

  async function saveOwnerProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    setIsSavingProfile(true);
    setProfileMessage("");

    try {
      const response = await fetch("/api/owners/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: activeOwner,
          displayName: readText(form, "displayName"),
          phone: readText(form, "phone"),
          email: readText(form, "email"),
        }),
      });
      const payload = (await response.json()) as {
        profile?: OwnerProfile;
        error?: string;
      };

      if (!response.ok || !payload.profile) {
        setProfileMessage(payload.error || "Owner profile could not be saved.");
        showNotification(
          "error",
          payload.error || "Owner profile could not be saved.",
        );
        return;
      }

      setOwnerProfile(payload.profile);
      setProfileMessage("Profile saved.");
      showNotification("success", "Owner profile saved.");
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function changePin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    setSecurityMessage("");

    const response = await fetch("/api/auth/change-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner: activeOwner,
        currentPin: readText(form, "currentPin"),
        newPin: readText(form, "newPin"),
      }),
    });
    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setSecurityMessage(payload.error || "PIN could not be changed.");
      showNotification("error", payload.error || "PIN could not be changed.");
      return;
    }

    setSecurityMessage("PIN changed. Use the new PIN next time.");
    showNotification("success", "PIN changed successfully.");
    event.currentTarget.reset();
  }

  async function recoverPin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    setRecoveryMessage("");

    const response = await fetch("/api/auth/recover-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner: readText(form, "recoveryOwner"),
        recoveryCode: readText(form, "recoveryCode").toUpperCase(),
        newPin: readText(form, "recoveryPin"),
      }),
    });
    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setRecoveryMessage(payload.error || "PIN could not be recovered.");
      showNotification("error", payload.error || "PIN could not be recovered.");
      return;
    }

    setRecoveryMessage("PIN reset. You can log in with the new PIN now.");
    showNotification("success", "PIN reset successfully.");
    event.currentTarget.reset();
  }

  async function submitEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    setIsSavingEntry(true);

    try {
      const response = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryType: readText(form, "entryType"),
          category: readText(form, "category"),
          amount: readText(form, "amount"),
          quantity: readText(form, "quantity"),
          ownerName: readText(form, "ownerName"),
          createdBy: activeOwner,
          entryDate: readText(form, "entryDate"),
          note: readText(form, "note"),
        }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        showNotification("error", payload.error || "Entry could not be saved.");
        return;
      }

      showNotification(
        "success",
        "Entry submitted. It needs 2 owner approvals before it is accepted.",
      );
      event.currentTarget.reset();
      setSelectedEntryType("expense");
      await loadEntries();
    } finally {
      setIsSavingEntry(false);
    }
  }

  async function approveEntry(entryId: number) {
    setIsApprovingEntry(entryId);

    try {
      const response = await fetch("/api/entries/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId, ownerName: activeOwner }),
      });
      const payload = (await response.json()) as {
        approval?: { status: "pending" | "accepted"; approvalCount: number };
        entries?: EntriesData;
        error?: string;
      };

      if (!response.ok || !payload.approval) {
        showNotification("error", payload.error || "Entry could not be approved.");
        return;
      }

      if (payload.entries) {
        setEntriesData(payload.entries);
      } else {
        await loadEntries();
      }

      showNotification(
        "success",
        payload.approval.status === "accepted"
          ? "Entry accepted. It has 2 owner approvals."
          : "Approval saved. One more owner approval is needed.",
      );
    } finally {
      setIsApprovingEntry(null);
    }
  }

  async function refreshDatabaseStatus() {
    setIsCheckingDatabase(true);

    try {
      const response = await fetch("/api/database");
      const status = (await response.json()) as DatabaseStatus;
      setDatabaseStatus(status);
    } finally {
      setIsCheckingDatabase(false);
    }
  }

  async function initializeDatabase() {
    setIsCheckingDatabase(true);

    try {
      const response = await fetch("/api/database", { method: "POST" });
      const status = (await response.json()) as DatabaseStatus;
      setDatabaseStatus(status);
    } finally {
      setIsCheckingDatabase(false);
    }
  }

  function logoutOwner() {
    window.localStorage.removeItem(ownerSessionKey);
    setActiveOwner("");
    setOwnerProfile(null);
    setProfileMessage("");
    setSecurityMessage("");
    setNotification(null);
  }

  useEffect(() => {
    if (activeOwner) {
      void Promise.resolve().then(() => {
        void refreshDatabaseStatus();
        void loadOwnerProfile(activeOwner);
        void loadEntries();
      });
    }
  }, [activeOwner, loadEntries]);

  const categories = entriesData?.categories ?? {};
  const selectedCategories = categories[selectedEntryType] ?? [];
  const today = new Date().toISOString().slice(0, 10);

  if (activeOwner) {
    return (
      <main className="app-shell">
        {notification && (
          <div
            className={`notification notification-${notification.tone}`}
            role="status"
          >
            <span>{notification.message}</span>
            <button
              aria-label="Dismiss notification"
              onClick={() => setNotification(null)}
              type="button"
            >
              X
            </button>
          </div>
        )}
        <section className="start-panel" aria-label="Owner start screen">
          <div>
            <p className="eyebrow">Owner workspace</p>
            <h1>AgriBro</h1>
            <p className="intro">
              Signed in as {ownerProfile?.displayName || activeOwner}. Manage
              your owner profile and security before the business tools are
              added.
            </p>
          </div>
          <button className="logout-button" onClick={logoutOwner} type="button">
            Log out
          </button>
        </section>
        <section className="profile-panel" aria-label="Owner profile">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Owner profile</p>
              <h2>{ownerProfile?.displayName || activeOwner}</h2>
              <p>Each owner has a separate profile stored in the database.</p>
            </div>
            <span className="role-badge">{ownerProfile?.role || "Owner"}</span>
          </div>
          <form
            className="profile-form"
            key={ownerProfile?.updatedAt || activeOwner}
            onSubmit={saveOwnerProfile}
          >
            <label>
              Display name
              <input
                defaultValue={ownerProfile?.displayName || activeOwner}
                name="displayName"
                placeholder="Owner display name"
              />
            </label>
            <label>
              Phone
              <input
                defaultValue={ownerProfile?.phone || ""}
                name="phone"
                placeholder="Owner phone number"
                type="tel"
              />
            </label>
            <label>
              Email
              <input
                defaultValue={ownerProfile?.email || ""}
                name="email"
                placeholder="Owner email"
                type="email"
              />
            </label>
            <button disabled={isSavingProfile} type="submit">
              Save profile
            </button>
          </form>
          {profileMessage && (
            <p
              className={
                profileMessage.includes("saved") ? "form-success" : "form-error"
              }
            >
              {profileMessage}
            </p>
          )}
        </section>
        <section className="profile-panel" aria-label="Owner security">
          <div>
            <p className="eyebrow">Security</p>
            <h2>Change PIN</h2>
            <p>Update your owner PIN after signing in with the current one.</p>
          </div>
          <form className="profile-form compact-form" onSubmit={changePin}>
            <label>
              Current PIN
              <input
                autoComplete="current-password"
                inputMode="numeric"
                maxLength={8}
                name="currentPin"
                placeholder="Current PIN"
                type="password"
              />
            </label>
            <label>
              New PIN
              <input
                autoComplete="new-password"
                inputMode="numeric"
                maxLength={8}
                minLength={4}
                name="newPin"
                placeholder="New PIN"
                type="password"
              />
            </label>
            <button type="submit">Change PIN</button>
          </form>
          {securityMessage && (
            <p
              className={
                securityMessage.includes("changed")
                  ? "form-success"
                  : "form-error"
              }
            >
              {securityMessage}
            </p>
          )}
        </section>
        <section className="entry-panel" aria-label="Business entry form">
          <div>
            <p className="eyebrow">Business entries</p>
            <h2>Add entry for approval</h2>
            <p>
              Real entries stay pending until at least 2 owners accept them.
            </p>
          </div>
          <form className="entry-form" onSubmit={submitEntry}>
            <label>
              Entry type
              <select
                name="entryType"
                onChange={(event) => setSelectedEntryType(event.target.value)}
                value={selectedEntryType}
              >
                {Object.entries(entryTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Category
              <select name="category" required>
                <option value="">Choose category</option>
                {selectedCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Amount
              <input
                min="0.01"
                name="amount"
                placeholder="0.00"
                required
                step="0.01"
                type="number"
              />
            </label>
            <label>
              Owner
              <select name="ownerName" defaultValue={activeOwner} required>
                {owners.map((owner) => (
                  <option key={owner.name} value={owner.name}>
                    {owner.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Date
              <input defaultValue={today} name="entryDate" required type="date" />
            </label>
            <label>
              Quantity
              <input name="quantity" placeholder="Optional" />
            </label>
            <label className="entry-note">
              Note
              <input name="note" placeholder="Optional details" />
            </label>
            <button disabled={isSavingEntry} type="submit">
              Submit entry
            </button>
          </form>
        </section>
        <section className="entry-panel" aria-label="Owner notifications">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Owner notifications</p>
              <h2>Pending approvals</h2>
              <p>
                {entriesData?.pending.length
                  ? `${entriesData.pending.length} entry needs owner approval.`
                  : "No entries are waiting for approval."}
              </p>
            </div>
            <span className="role-badge">2 approvals required</span>
          </div>
          <div className="entry-list">
            {entriesData?.pending.map((entry) => (
              <article className="entry-card" key={entry.id}>
                <div>
                  <strong>
                    {entryTypeLabels[entry.entryType]} - {entry.category}
                  </strong>
                  <span>
                    Rs {entry.amount.toFixed(2)} by {entry.ownerName} on{" "}
                    {entry.entryDate}
                  </span>
                  {entry.quantity && <span>Quantity: {entry.quantity}</span>}
                  {entry.note && <span>Note: {entry.note}</span>}
                  <span>
                    Submitted by {entry.createdBy}. Approved by{" "}
                    {entry.approvedBy.length ? entry.approvedBy.join(", ") : "none"}.
                  </span>
                </div>
                <div className="approval-actions">
                  <span>{entry.approvalCount}/2 accepted</span>
                  <button
                    disabled={
                      isApprovingEntry === entry.id ||
                      entry.approvedBy.includes(activeOwner)
                    }
                    onClick={() => approveEntry(entry.id)}
                    type="button"
                  >
                    {entry.approvedBy.includes(activeOwner)
                      ? "Accepted"
                      : "Accept"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="entry-panel" aria-label="Accepted entries">
          <div>
            <p className="eyebrow">Accepted database</p>
            <h2>Accepted entries</h2>
            <p>
              These entries have at least 2 owner approvals and are ready for
              reports.
            </p>
          </div>
          <div className="entry-list">
            {entriesData?.accepted.length ? (
              entriesData.accepted.map((entry) => (
                <article className="entry-card accepted-card" key={entry.id}>
                  <div>
                    <strong>
                      {entryTypeLabels[entry.entryType]} - {entry.category}
                    </strong>
                    <span>
                      Rs {entry.amount.toFixed(2)} by {entry.ownerName} on{" "}
                      {entry.entryDate}
                    </span>
                  </div>
                  <span>{entry.approvalCount}/2 accepted</span>
                </article>
              ))
            ) : (
              <p>No accepted entries yet.</p>
            )}
          </div>
        </section>
        <section className="database-panel" aria-label="Database status">
          <div>
            <p className="eyebrow">Database system</p>
            <h2>Shared storage</h2>
            <p>
              {databaseStatus?.message ??
                "Checking database connection for AgriBro."}
            </p>
          </div>
          <div className="database-facts">
            <span>
              Configured: <strong>{databaseStatus?.configured ? "Yes" : "No"}</strong>
            </span>
            <span>
              Connected: <strong>{databaseStatus?.connected ? "Yes" : "No"}</strong>
            </span>
            <span>
              Initialized:{" "}
              <strong>{databaseStatus?.initialized ? "Yes" : "No"}</strong>
            </span>
            {databaseStatus?.databaseName && (
              <span>
                Database: <strong>{databaseStatus.databaseName}</strong>
              </span>
            )}
            {databaseStatus?.ownerCount !== undefined && (
              <span>
                Owners saved: <strong>{databaseStatus.ownerCount}</strong>
              </span>
            )}
          </div>
          <div className="database-actions">
            <button
              disabled={isCheckingDatabase}
              onClick={refreshDatabaseStatus}
              type="button"
            >
              Check database
            </button>
            <button
              disabled={
                isCheckingDatabase ||
                !databaseStatus?.configured ||
                !databaseStatus?.connected
              }
              onClick={initializeDatabase}
              type="button"
            >
              Initialize tables
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="login-shell">
      {notification && (
        <div
          className={`notification notification-${notification.tone}`}
          role="status"
        >
          <span>{notification.message}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotification(null)}
            type="button"
          >
            X
          </button>
        </div>
      )}
      <section className="login-panel" aria-label="Owner login">
        <div>
          <p className="eyebrow">Private owner portal</p>
          <h1>AgriBro</h1>
          <p className="intro">
            Sign in as one of the owners. Owner PINs are checked against the
            secure database before the workspace opens.
          </p>
        </div>
        <form className="login-form" onSubmit={loginOwner}>
          <h2>Owner login</h2>
          <label>
            Owner
            <select name="owner" defaultValue="" required>
              <option value="" disabled>
                Choose owner
              </option>
              {owners.map((owner) => (
                <option key={owner.name} value={owner.name}>
                  {owner.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            PIN
            <input
              autoComplete="current-password"
              inputMode="numeric"
              maxLength={8}
              minLength={4}
              name="pin"
              placeholder="Owner PIN"
              type="password"
            />
          </label>
          {loginError && <p className="form-error">{loginError}</p>}
          <button type="submit">Log in</button>
        </form>
        <form
          className="login-form recovery-form"
          onSubmit={recoverPin}
          aria-label="Recover PIN"
        >
          <h2>Recover PIN</h2>
          <label>
            Owner
            <select name="recoveryOwner" defaultValue="" required>
              <option value="" disabled>
                Choose owner
              </option>
              {owners.map((owner) => (
                <option key={owner.name} value={owner.name}>
                  {owner.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Recovery code
            <input
              autoComplete="one-time-code"
              name="recoveryCode"
              placeholder="Recovery code"
            />
          </label>
          <label>
            New PIN
            <input
              autoComplete="new-password"
              inputMode="numeric"
              maxLength={8}
              minLength={4}
              name="recoveryPin"
              placeholder="New PIN"
              type="password"
            />
          </label>
          {recoveryMessage && (
            <p
              className={
                recoveryMessage.includes("reset") ? "form-success" : "form-error"
              }
            >
              {recoveryMessage}
            </p>
          )}
          <button type="submit">Reset PIN</button>
        </form>
        <div className="pin-list" aria-label="Initial owner PINs">
          <strong>Initial setup PINs</strong>
          <span>Anish 1111</span>
          <span>Anoup 2222</span>
          <span>Shivam 3333</span>
          <span>Inben 4444</span>
        </div>
        <div className="pin-list" aria-label="Initial recovery codes">
          <strong>Initial recovery codes</strong>
          <span>Anish ANISH-2026</span>
          <span>Anoup ANOUP-2026</span>
          <span>Shivam SHIVAM-2026</span>
          <span>Inben INBEN-2026</span>
        </div>
      </section>
    </main>
  );
}
