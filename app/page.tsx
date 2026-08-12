"use client";

import { FormEvent, useEffect, useState } from "react";

type Owner = {
  name: string;
  pin: string;
};

type DatabaseStatus = {
  configured: boolean;
  connected: boolean;
  initialized: boolean;
  databaseName?: string;
  ownerCount?: number;
  message: string;
};

const owners: Owner[] = [
  { name: "Anish", pin: "1111" },
  { name: "Anoup", pin: "2222" },
  { name: "Shivam", pin: "3333" },
  { name: "Inben", pin: "4444" },
];

const ownerSessionKey = "agribro-owner-session";

function readText(form: FormData, key: string) {
  return String(form.get(key) || "").trim();
}

export default function Home() {
  const [activeOwner, setActiveOwner] = useState("");
  const [databaseStatus, setDatabaseStatus] = useState<DatabaseStatus | null>(
    null,
  );
  const [isCheckingDatabase, setIsCheckingDatabase] = useState(false);
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    const savedOwner = window.localStorage.getItem(ownerSessionKey);

    if (savedOwner && owners.some((owner) => owner.name === savedOwner)) {
      setActiveOwner(savedOwner);
    }
  }, []);

  function loginOwner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const ownerName = readText(form, "owner");
    const pin = readText(form, "pin");
    const owner = owners.find((item) => item.name === ownerName);

    if (!owner || owner.pin !== pin) {
      setLoginError("Owner name or PIN is not correct.");
      return;
    }

    window.localStorage.setItem(ownerSessionKey, owner.name);
    setActiveOwner(owner.name);
    setLoginError("");
    event.currentTarget.reset();
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
  }

  useEffect(() => {
    if (activeOwner) {
      void refreshDatabaseStatus();
    }
  }, [activeOwner]);

  if (activeOwner) {
    return (
      <main className="app-shell">
        <section className="start-panel" aria-label="Owner start screen">
          <div>
            <p className="eyebrow">Owner workspace</p>
            <h1>AgriBro</h1>
            <p className="intro">
              Signed in as {activeOwner}. The business app is ready to be built
              from the start.
            </p>
          </div>
          <button className="logout-button" onClick={logoutOwner} type="button">
            Log out
          </button>
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
      <section className="login-panel" aria-label="Owner login">
        <div>
          <p className="eyebrow">Private owner portal</p>
          <h1>AgriBro</h1>
          <p className="intro">
            Sign in as one of the owners. We will build the rest of the
            business system from here.
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
              maxLength={4}
              name="pin"
              placeholder="4-digit PIN"
              type="password"
            />
          </label>
          {loginError && <p className="form-error">{loginError}</p>}
          <button type="submit">Log in</button>
        </form>
        <div className="pin-list" aria-label="Temporary owner PINs">
          <strong>Temporary owner PINs</strong>
          <span>Anish 1111</span>
          <span>Anoup 2222</span>
          <span>Shivam 3333</span>
          <span>Inben 4444</span>
        </div>
      </section>
    </main>
  );
}
