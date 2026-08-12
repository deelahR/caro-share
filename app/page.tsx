"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Partner = {
  name: string;
  investment: number;
};

type Land = {
  name: string;
  area: string;
  crop: string;
  status: string;
  planted: string;
  harvest: string;
};

type MoneyRecord = {
  id: number;
  date: string;
  label: string;
  category: string;
  amount: number;
};

type SaleRecord = MoneyRecord & {
  quantity: string;
  buyer: string;
};

type AppData = {
  partners: Partner[];
  lands: Land[];
  expenses: MoneyRecord[];
  sales: SaleRecord[];
};

type Owner = {
  name: string;
  pin: string;
};

const currency = new Intl.NumberFormat("en-MU", {
  style: "currency",
  currency: "MUR",
  maximumFractionDigits: 0,
});

const owners: Owner[] = [
  { name: "Anish", pin: "1111" },
  { name: "Anoup", pin: "2222" },
  { name: "Shivam", pin: "3333" },
  { name: "Inben", pin: "4444" },
];

const startingData: AppData = {
  partners: [
    { name: "Anish", investment: 0 },
    { name: "Anoup", investment: 0 },
    { name: "Shivam", investment: 0 },
    { name: "Inben", investment: 0 },
  ],
  lands: [
    {
      name: "Land 1",
      area: "",
      crop: "",
      status: "",
      planted: "",
      harvest: "",
    },
    {
      name: "Land 2",
      area: "",
      crop: "",
      status: "",
      planted: "",
      harvest: "",
    },
  ],
  expenses: [],
  sales: [],
};

const storageKey = "farmledger-data-v2";
const ownerSessionKey = "farmledger-owner-session";

function readNumber(form: FormData, key: string) {
  return Number(form.get(key) || 0);
}

function readText(form: FormData, key: string) {
  return String(form.get(key) || "").trim();
}

export default function Home() {
  const [data, setData] = useState<AppData>(startingData);
  const [splitMode, setSplitMode] = useState<"equal" | "investment">("equal");
  const [activeOwner, setActiveOwner] = useState("");
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (saved) {
      setData(JSON.parse(saved) as AppData);
    }

    const savedOwner = window.localStorage.getItem(ownerSessionKey);
    if (savedOwner && owners.some((owner) => owner.name === savedOwner)) {
      setActiveOwner(savedOwner);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(data));
  }, [data]);

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

  function logoutOwner() {
    window.localStorage.removeItem(ownerSessionKey);
    setActiveOwner("");
  }

  const totals = useMemo(() => {
    const investment = data.partners.reduce((sum, item) => sum + item.investment, 0);
    const expenses = data.expenses.reduce((sum, item) => sum + item.amount, 0);
    const sales = data.sales.reduce((sum, item) => sum + item.amount, 0);
    const profit = sales - expenses;

    return { investment, expenses, sales, profit, cash: investment + sales - expenses };
  }, [data]);

  const partnerShares = useMemo(() => {
    const equalShare = data.partners.length ? totals.profit / data.partners.length : 0;

    return data.partners.map((partner) => {
      const investmentShare = totals.investment
        ? totals.profit * (partner.investment / totals.investment)
        : 0;

      return {
        ...partner,
        equalShare,
        investmentShare,
        activeShare: splitMode === "equal" ? equalShare : investmentShare,
        percent: totals.investment ? (partner.investment / totals.investment) * 100 : 0,
      };
    });
  }, [data.partners, splitMode, totals.investment, totals.profit]);

  function updatePartner(index: number, investment: number) {
    setData((current) => ({
      ...current,
      partners: current.partners.map((partner, partnerIndex) =>
        partnerIndex === index ? { ...partner, investment } : partner,
      ),
    }));
  }

  function updateLand(index: number, field: keyof Land, value: string) {
    setData((current) => ({
      ...current,
      lands: current.lands.map((land, landIndex) =>
        landIndex === index ? { ...land, [field]: value } : land,
      ),
    }));
  }

  function addExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const label = readText(form, "label");
    const amount = readNumber(form, "amount");

    if (!label || amount <= 0) return;

    setData((current) => ({
      ...current,
      expenses: [
        {
          id: Date.now(),
          date: readText(form, "date"),
          label,
          category: readText(form, "category") || "General",
          amount,
        },
        ...current.expenses,
      ],
    }));
    event.currentTarget.reset();
  }

  function addSale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const label = readText(form, "label");
    const amount = readNumber(form, "amount");

    if (!label || amount <= 0) return;

    setData((current) => ({
      ...current,
      sales: [
        {
          id: Date.now(),
          date: readText(form, "date"),
          label,
          category: readText(form, "category") || "Vegetable",
          quantity: readText(form, "quantity"),
          buyer: readText(form, "buyer") || "Customer",
          amount,
        },
        ...current.sales,
      ],
    }));
    event.currentTarget.reset();
  }

  if (!activeOwner) {
    return (
      <main className="login-shell">
        <section className="login-panel" aria-label="Owner login">
          <div>
            <p className="eyebrow">Owner access</p>
            <h1>Grow Ledger</h1>
            <p className="intro">
              Sign in as one of the four owners to view and update the farm
              business records.
            </p>
          </div>
          <form className="login-form" onSubmit={loginOwner}>
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
          <div className="pin-list" aria-label="Prototype PINs">
            <strong>Prototype PINs</strong>
            <span>Anish 1111</span>
            <span>Anoup 2222</span>
            <span>Shivam 3333</span>
            <span>Inben 4444</span>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="topbar" aria-label="Business summary">
        <div>
          <p className="eyebrow">Vegetable farming management</p>
          <h1>Grow Ledger</h1>
          <p className="intro">
            A clear operating dashboard for Anish, Anoup, Shivam, and Inben to
            track land, investment, sales, expenses, and partner profit.
          </p>
        </div>
        <div className="owner-tools">
          <div className="owner-badge">
            <span>Signed in</span>
            <strong>{activeOwner}</strong>
          </div>
          <button className="logout-button" onClick={logoutOwner} type="button">
            Log out
          </button>
          <div className="mode-switch" aria-label="Profit sharing method">
            <button
              className={splitMode === "equal" ? "active" : ""}
              onClick={() => setSplitMode("equal")}
              type="button"
            >
              Equal split
            </button>
            <button
              className={splitMode === "investment" ? "active" : ""}
              onClick={() => setSplitMode("investment")}
              type="button"
            >
              By investment
            </button>
          </div>
        </div>
      </section>

      <section className="metrics" aria-label="Financial totals">
        <Metric label="Total investment" value={currency.format(totals.investment)} />
        <Metric label="Sales received" value={currency.format(totals.sales)} />
        <Metric label="Expenses paid" value={currency.format(totals.expenses)} />
        <Metric
          label="Current profit"
          value={currency.format(totals.profit)}
          tone={totals.profit >= 0 ? "good" : "bad"}
        />
        <Metric label="Cash position" value={currency.format(totals.cash)} />
      </section>

      <section className="layout-grid">
        <div className="panel wide">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Ownership clarity</p>
              <h2>Partners and profit share</h2>
            </div>
            <span>{splitMode === "equal" ? "25% each" : "weighted by capital"}</span>
          </div>
          <div className="partner-list">
            {partnerShares.map((partner, index) => (
              <article className="partner-row" key={partner.name}>
                <div>
                  <strong>{partner.name}</strong>
                  <small>{partner.percent.toFixed(1)}% of investment</small>
                </div>
                <label>
                  Investment
                  <input
                    min="0"
                    type="number"
                    value={partner.investment}
                    onChange={(event) => updatePartner(index, Number(event.target.value))}
                  />
                </label>
                <div className="share-box">
                  <span>Profit due</span>
                  <strong>{currency.format(partner.activeShare)}</strong>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Cultivation</p>
              <h2>Two land plots</h2>
            </div>
          </div>
          <div className="land-stack">
            {data.lands.map((land, index) => (
              <article className="land-card" key={land.name}>
                <div className="land-title">
                  <strong>{land.name}</strong>
                  <input
                    aria-label={`${land.name} status`}
                    value={land.status}
                    onChange={(event) => updateLand(index, "status", event.target.value)}
                  />
                </div>
                <label>
                  Area
                  <input
                    value={land.area}
                    onChange={(event) => updateLand(index, "area", event.target.value)}
                  />
                </label>
                <label>
                  Crop
                  <input
                    value={land.crop}
                    onChange={(event) => updateLand(index, "crop", event.target.value)}
                  />
                </label>
                <div className="date-grid">
                  <label>
                    Planted
                    <input
                      type="date"
                      value={land.planted}
                      onChange={(event) => updateLand(index, "planted", event.target.value)}
                    />
                  </label>
                  <label>
                    Harvest
                    <input
                      type="date"
                      value={land.harvest}
                      onChange={(event) => updateLand(index, "harvest", event.target.value)}
                    />
                  </label>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="forms-grid">
        <RecordPanel title="Add expense" onSubmit={addExpense} amountLabel="Cost" />
        <RecordPanel title="Add sale" onSubmit={addSale} amountLabel="Received" isSale />
      </section>

      <section className="layout-grid bottom">
        <Records title="Recent sales" records={data.sales} isSale />
        <Records title="Recent expenses" records={data.expenses} />
      </section>
    </main>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "bad";
}) {
  return (
    <article className={`metric ${tone || ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function RecordPanel({
  title,
  onSubmit,
  amountLabel,
  isSale = false,
}: {
  title: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  amountLabel: string;
  isSale?: boolean;
}) {
  return (
    <form className="panel record-form" onSubmit={onSubmit}>
      <h2>{title}</h2>
      <div className="form-grid">
        <label>
          Date
          <input name="date" type="date" />
        </label>
        <label>
          {isSale ? "Vegetable" : "Category"}
          <input name="category" placeholder={isSale ? "Tomato" : "Seeds"} />
        </label>
        <label className="span-two">
          Description
          <input name="label" placeholder={isSale ? "Market sale" : "Fertilizer"} />
        </label>
        {isSale && (
          <>
            <label>
              Quantity
              <input name="quantity" placeholder="50 kg" />
            </label>
            <label>
              Buyer
              <input name="buyer" placeholder="Customer name" />
            </label>
          </>
        )}
        <label>
          {amountLabel}
          <input min="1" name="amount" placeholder="0" type="number" />
        </label>
      </div>
      <button type="submit">Save record</button>
    </form>
  );
}

function Records({
  title,
  records,
  isSale = false,
}: {
  title: string;
  records: MoneyRecord[] | SaleRecord[];
  isSale?: boolean;
}) {
  return (
    <div className="panel">
      <div className="panel-heading">
        <h2>{title}</h2>
      </div>
      <div className="records">
        {records.length === 0 ? (
          <p className="empty-state">No records yet.</p>
        ) : (
          records.map((record) => (
            <article className="record" key={record.id}>
              <div>
                <strong>{record.label}</strong>
                <small>
                  {record.date || "No date"} - {record.category}
                  {isSale && "quantity" in record
                    ? ` - ${record.quantity || "No quantity"} - ${record.buyer}`
                    : ""}
                </small>
              </div>
              <span>{currency.format(record.amount)}</span>
            </article>
          ))
        )}
      </div>
    </div>
  );
}

