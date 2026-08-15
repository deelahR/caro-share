"use client";

/* eslint-disable @next/next/no-img-element */

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

type OwnerSummary = {
  ownerName: string;
  investment: number;
  expense: number;
  sale: number;
  assetValue: number;
  netContribution: number;
};

type BusinessSummary = {
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

type Notification = {
  id: number;
  tone: "success" | "error" | "info";
  message: string;
  isRead?: boolean;
  createdAt: string;
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

type EquipmentItem = {
  id: number;
  name: string;
  status: "available" | "upcoming";
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

type EquipmentDeleteRequest = {
  id: number;
  equipmentId: number | null;
  itemName: string;
  requestedBy: string;
  approvalCount: number;
  approvedBy: string[];
  createdAt: string;
};

type EquipmentAddRequest = {
  id: number;
  name: string;
  status: "available" | "upcoming";
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

type EquipmentData = {
  available: EquipmentItem[];
  upcoming: EquipmentItem[];
  additionRequests: EquipmentAddRequest[];
  deletionRequests: EquipmentDeleteRequest[];
};

type EquipmentDraft = {
  estimatedCost: string;
  ownerName: string;
  quantity: string;
  targetDate: string;
  note: string;
};

type AppSection =
  | "dashboard"
  | "summary"
  | "entries"
  | "approvals"
  | "records"
  | "equipment"
  | "account"
  | "system";

type EquipmentSection = "add" | "list";

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

function readImageFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function formatNotificationTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isDateInRange(value: string, startDate: string, endDate: string) {
  if (!value) {
    return !startDate && !endDate;
  }

  return (!startDate || value >= startDate) && (!endDate || value <= endDate);
}

export default function Home() {
  const [activeOwner, setActiveOwner] = useState("");
  const [activeSection, setActiveSection] = useState<AppSection>("dashboard");
  const [ownerProfile, setOwnerProfile] = useState<OwnerProfile | null>(null);
  const [databaseStatus, setDatabaseStatus] = useState<DatabaseStatus | null>(
    null,
  );
  const [businessSummary, setBusinessSummary] = useState<BusinessSummary | null>(
    null,
  );
  const [isCheckingDatabase, setIsCheckingDatabase] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [securityMessage, setSecurityMessage] = useState("");
  const [recoveryMessage, setRecoveryMessage] = useState("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const unreadNotificationCount = notifications.filter(
    (notification) => !notification.isRead,
  ).length;
  const [entriesData, setEntriesData] = useState<EntriesData | null>(null);
  const [equipmentData, setEquipmentData] = useState<EquipmentData | null>(null);
  const [selectedEntryType, setSelectedEntryType] = useState("expense");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [equipmentImage, setEquipmentImage] = useState("");
  const [equipmentSearch, setEquipmentSearch] = useState("");
  const [summaryOwnerFilter, setSummaryOwnerFilter] = useState("");
  const [summaryTypeFilter, setSummaryTypeFilter] = useState("all");
  const [summaryStartDate, setSummaryStartDate] = useState("");
  const [summaryEndDate, setSummaryEndDate] = useState("");
  const [equipmentDraft, setEquipmentDraft] = useState<EquipmentDraft | null>(
    null,
  );
  const [activeEquipmentSection, setActiveEquipmentSection] =
    useState<EquipmentSection>("list");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSavingEntry, setIsSavingEntry] = useState(false);
  const [isSavingEquipment, setIsSavingEquipment] = useState(false);
  const [isApprovingEntry, setIsApprovingEntry] = useState<number | null>(null);
  const [isApprovingEquipmentAdd, setIsApprovingEquipmentAdd] = useState<
    number | null
  >(null);
  const [isDeletingEquipment, setIsDeletingEquipment] = useState<number | null>(
    null,
  );

  const showNotification = useCallback(
    (tone: Notification["tone"], message: string) => {
      setNotifications((current) => [
        {
          id: Date.now(),
          tone,
          message,
          createdAt: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
        ...current,
      ].slice(0, 12));
      setIsNotificationOpen(true);
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

  const loadEquipment = useCallback(async () => {
    const response = await fetch("/api/equipment");
    const payload = (await response.json()) as EquipmentData & { error?: string };

    if (!response.ok) {
      showNotification(
        "error",
        payload.error || "Equipment could not be loaded.",
      );
      return;
    }

    setEquipmentData(payload);
  }, [showNotification]);

  const loadBusinessSummary = useCallback(async () => {
    const response = await fetch("/api/summary");
    const payload = (await response.json()) as BusinessSummary & { error?: string };

    if (!response.ok) {
      showNotification("error", payload.error || "Summary could not be loaded.");
      return;
    }

    setBusinessSummary(payload);
  }, [showNotification]);

  const loadNotifications = useCallback(
    async (showErrors = true) => {
      const response = await fetch("/api/notifications");
      const payload = (await response.json()) as {
        notifications?: Notification[];
        error?: string;
      };

      if (!response.ok || !payload.notifications) {
        if (showErrors) {
          showNotification(
            "error",
            response.status === 401
              ? "Please log in again to load notifications."
              : payload.error || "Notifications could not be loaded.",
          );
        }
        return;
      }

      setNotifications(
        payload.notifications.map((notification) => ({
          ...notification,
          createdAt: formatNotificationTime(notification.createdAt),
        })),
      );
    },
    [showNotification],
  );

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
        "Entry submitted. Your approval is counted; one more owner must accept it.",
      );
      event.currentTarget.reset();
      setSelectedEntryType("expense");
      setSelectedCategory("");
      await loadBusinessSummary();
      await loadEntries();
      await loadNotifications();
    } finally {
      setIsSavingEntry(false);
    }
  }

  function linkEquipmentContribution(formElement: HTMLFormElement | null) {
    if (!formElement) {
      return;
    }

    const form = new FormData(formElement);

    setEquipmentDraft({
      estimatedCost: readText(form, "amount"),
      ownerName: readText(form, "ownerName") || activeOwner,
      quantity: readText(form, "quantity") || "1",
      targetDate: readText(form, "entryDate") || today,
      note: readText(form, "note"),
    });
    setActiveSection("equipment");
    setActiveEquipmentSection("add");
    showNotification(
      "success",
      "Equipment contribution linked. Add the equipment details now.",
    );
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
      await loadBusinessSummary();
      await loadNotifications();

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

  async function submitEquipment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    setIsSavingEquipment(true);

    try {
      const response = await fetch("/api/equipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: readText(form, "equipmentName"),
          status: readText(form, "equipmentStatus"),
          quantity: readText(form, "equipmentQuantity"),
          estimatedCost: readText(form, "equipmentCost"),
          targetDate: readText(form, "equipmentDate"),
          ownerName: readText(form, "equipmentOwner"),
          createdBy: activeOwner,
          imageData: equipmentImage,
          note: readText(form, "equipmentNote"),
        }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        showNotification(
          "error",
          payload.error || "Equipment could not be saved.",
        );
        return;
      }

      showNotification(
        "success",
        "Equipment submitted for approval. One more owner must accept it.",
      );
      event.currentTarget.reset();
      setEquipmentImage("");
      setEquipmentDraft(null);
      await loadBusinessSummary();
      await loadEquipment();
      await loadNotifications();
    } finally {
      setIsSavingEquipment(false);
    }
  }

  async function chooseEquipmentImage(event: FormEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];

    if (!file) {
      setEquipmentImage("");
      return;
    }

    if (!file.type.startsWith("image/")) {
      showNotification("error", "Please choose an image file.");
      event.currentTarget.value = "";
      return;
    }

    if (file.size > 1_500_000) {
      showNotification("error", "Image is too large. Please use a smaller photo.");
      event.currentTarget.value = "";
      return;
    }

    setEquipmentImage(await readImageFile(file));
  }

  async function approveEquipmentAddition(requestId: number) {
    setIsApprovingEquipmentAdd(requestId);

    try {
      const response = await fetch("/api/equipment", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, ownerName: activeOwner }),
      });
      const payload = (await response.json()) as {
        addition?: { status: "pending" | "accepted"; approvalCount: number };
        equipment?: EquipmentData;
        error?: string;
      };

      if (!response.ok || !payload.addition) {
        showNotification(
          "error",
          payload.error || "Equipment addition could not be approved.",
        );
        return;
      }

      if (payload.equipment) {
        setEquipmentData(payload.equipment);
      } else {
        await loadEquipment();
      }
      await loadBusinessSummary();
      await loadNotifications();

      showNotification(
        "success",
        payload.addition.status === "accepted"
          ? "Equipment accepted and added to the register."
          : "Equipment approval saved. One more owner approval is needed.",
      );
    } finally {
      setIsApprovingEquipmentAdd(null);
    }
  }

  async function requestDeleteEquipment(equipmentId: number) {
    setIsDeletingEquipment(equipmentId);

    try {
      const response = await fetch("/api/equipment", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ equipmentId, ownerName: activeOwner }),
      });
      const payload = (await response.json()) as {
        deletion?: { status: "pending" | "deleted"; approvalCount: number };
        equipment?: EquipmentData;
        error?: string;
      };

      if (!response.ok || !payload.deletion) {
        showNotification(
          "error",
          payload.error || "Equipment deletion could not be approved.",
        );
        return;
      }

      if (payload.equipment) {
        setEquipmentData(payload.equipment);
      } else {
        await loadEquipment();
      }
      await loadBusinessSummary();
      await loadNotifications();

      showNotification(
        "success",
        payload.deletion.status === "deleted"
          ? "Equipment deleted after 2 owner approvals."
          : "Deletion request saved. One more owner approval is needed.",
      );
    } finally {
      setIsDeletingEquipment(null);
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
      if (activeOwner) {
        await loadNotifications();
      }
    } finally {
      setIsCheckingDatabase(false);
    }
  }

  async function clearNotifications() {
    if (!activeOwner) {
      setNotifications([]);
      return;
    }

    const response = await fetch("/api/notifications", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      showNotification("error", "Notifications could not be cleared.");
      return;
    }

    setNotifications([]);
  }

  async function dismissNotification(notificationId: number) {
    setNotifications((current) =>
      current.filter((notification) => notification.id !== notificationId),
    );

    const response = await fetch("/api/notifications", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId }),
    });

    if (!response.ok) {
      showNotification("error", "Notification could not be dismissed.");
      await loadNotifications();
    }
  }

  async function markNotificationsRead() {
    if (!unreadNotificationCount) {
      return;
    }

    setNotifications((current) =>
      current.map((notification) => ({ ...notification, isRead: true })),
    );

    const response = await fetch("/api/notifications", { method: "PATCH" });

    if (!response.ok) {
      await loadNotifications(false);
    }
  }

  function logoutOwner() {
    void fetch("/api/auth/logout", { method: "POST" });
    window.localStorage.removeItem(ownerSessionKey);
    setActiveOwner("");
    setOwnerProfile(null);
    setProfileMessage("");
    setSecurityMessage("");
    setNotifications([]);
    setIsNotificationOpen(false);
    setActiveSection("dashboard");
    setActiveEquipmentSection("list");
  }

  useEffect(() => {
    if (activeOwner) {
      void Promise.resolve().then(() => {
        void refreshDatabaseStatus();
        void loadBusinessSummary();
        void loadOwnerProfile(activeOwner);
        void loadEntries();
        void loadEquipment();
        void loadNotifications();
      });
    }
  }, [
    activeOwner,
    loadBusinessSummary,
    loadEntries,
    loadEquipment,
    loadNotifications,
  ]);

  useEffect(() => {
    if (!activeOwner) {
      return;
    }

    const interval = window.setInterval(() => {
      void loadNotifications(false);
    }, 30_000);

    return () => window.clearInterval(interval);
  }, [activeOwner, loadNotifications]);

  const categories = entriesData?.categories ?? {};
  const selectedCategories = categories[selectedEntryType] ?? [];
  const isEquipmentContribution =
    selectedEntryType === "investment" &&
    selectedCategory === "Equipment contribution";
  const today = new Date().toISOString().slice(0, 10);
  const pendingCount = entriesData?.pending.length ?? 0;
  const derivedAcceptedCount = entriesData?.accepted.length ?? 0;
  const derivedEquipmentCount =
    (equipmentData?.available.length ?? 0) + (equipmentData?.upcoming.length ?? 0);
  const equipmentAddRequestCount = equipmentData?.additionRequests.length ?? 0;
  const deletionRequestCount = equipmentData?.deletionRequests.length ?? 0;
  const derivedApprovalRequestCount =
    pendingCount + equipmentAddRequestCount + deletionRequestCount;
  const acceptedCount =
    businessSummary?.acceptedInvestmentRecords ?? derivedAcceptedCount;
  const equipmentCount = businessSummary?.equipmentItems ?? derivedEquipmentCount;
  const approvalRequestCount =
    businessSummary?.approvalRequests ?? derivedApprovalRequestCount;
  const normalizedEquipmentSearch = equipmentSearch.trim().toLowerCase();
  const filterEquipment = (items: EquipmentItem[]) =>
    normalizedEquipmentSearch
      ? items.filter((item) =>
          [
            item.name,
            item.ownerName,
            item.note,
            item.status,
            item.targetDate,
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedEquipmentSearch),
        )
      : items;
  const visibleAvailableEquipment = filterEquipment(
    equipmentData?.available ?? [],
  );
  const visibleUpcomingEquipment = filterEquipment(equipmentData?.upcoming ?? []);
  const visibleEquipmentCount =
    visibleAvailableEquipment.length + visibleUpcomingEquipment.length;
  const equipmentDraftKey = equipmentDraft
    ? [
        equipmentDraft.estimatedCost,
        equipmentDraft.ownerName,
        equipmentDraft.quantity,
        equipmentDraft.targetDate,
        equipmentDraft.note,
      ].join("|")
    : "blank-equipment";
  function openShortcut(section: AppSection, equipmentSection?: EquipmentSection) {
    setActiveSection(section);
    if (section === "equipment") {
      setActiveEquipmentSection(equipmentSection || "list");
    }
    setIsMenuOpen(false);
    setIsNotificationOpen(false);
  }

  function openNotificationShortcut(message: string) {
    const normalizedMessage = message.toLowerCase();

    if (normalizedMessage.includes("equipment")) {
      openShortcut(
        normalizedMessage.includes("approved") ||
          normalizedMessage.includes("added")
          ? "equipment"
          : "approvals",
      );
      return;
    }

    if (
      normalizedMessage.includes("approval") ||
      normalizedMessage.includes("requested") ||
      normalizedMessage.includes("submitted")
    ) {
      openShortcut("approvals");
      return;
    }

    if (
      normalizedMessage.includes("accepted") ||
      normalizedMessage.includes("saved")
    ) {
      openShortcut("records");
      return;
    }

    openShortcut("approvals");
  }

  const renderEquipmentCard = (item: EquipmentItem) => {
    const isUpcoming = item.status === "upcoming";
    const isDeletionPending = Boolean(item.deletionRequestId);
    const hasApprovedDeletion = item.deletionApprovedBy.includes(activeOwner);

    return (
      <article
        className={`equipment-card ${
          isUpcoming ? "upcoming-equipment" : "available-equipment"
        }`}
        key={item.id}
      >
        <div className="equipment-card-main">
          {item.imageData ? (
            <img
              alt={`${item.name} equipment`}
              className="equipment-photo"
              src={item.imageData}
            />
          ) : (
            <div className="equipment-photo equipment-photo-empty">No photo</div>
          )}
          <div className="equipment-card-body">
            <div className="equipment-card-top">
              <span className={`status-pill ${isUpcoming ? "upcoming-pill" : ""}`}>
                {isUpcoming ? "Upcoming" : "Available"}
              </span>
              {isDeletionPending && (
                <span className="status-pill delete-pending-pill">
                  Delete pending
                </span>
              )}
            </div>
            <strong>{item.name}</strong>
            <span className="equipment-meta">
              Qty {item.quantity} |{" "}
              {isUpcoming ? "estimated " : ""}Rs {item.estimatedCost.toFixed(2)}
            </span>
            <div className="equipment-detail-grid">
              <span>Responsible: {item.ownerName}</span>
              <span>Added by: {item.createdBy}</span>
              {item.targetDate && (
                <span>{isUpcoming ? "Target date" : "Date"}: {item.targetDate}</span>
              )}
              {item.note && <span>Note: {item.note}</span>}
            </div>
          </div>
        </div>
        {isDeletionPending && (
          <div className="equipment-card-status">
            <span>
              Removal approval pending: {item.deletionApprovalCount}/2
              {item.deletionApprovedBy.length
                ? ` by ${item.deletionApprovedBy.join(", ")}`
                : ""}
            </span>
            <small>
              {hasApprovedDeletion
                ? "You accepted this removal. Another owner must approve it in Approvals."
                : "Approve this equipment removal in Approvals."}
            </small>
          </div>
        )}
        {!isDeletionPending && (
          <div className="equipment-card-actions">
            <small>Removal needs 2 owner approvals before it leaves the list.</small>
            <button
              className="danger-button"
              disabled={isDeletingEquipment === item.id}
              onClick={() => {
                if (
                  window.confirm(
                    `Send "${item.name}" removal for owner approval?`,
                  )
                ) {
                  void requestDeleteEquipment(item.id);
                }
              }}
              type="button"
            >
              {isDeletingEquipment === item.id ? "Sending..." : "Remove item"}
            </button>
          </div>
        )}
      </article>
    );
  };
  const derivedTotalAccepted = entriesData?.accepted.reduce(
    (sum, entry) => sum + entry.amount,
    0,
  ) ?? 0;
  const totalAccepted = businessSummary?.acceptedAmount ?? derivedTotalAccepted;
  const derivedTotalDebit = entriesData?.accepted.reduce(
    (sum, entry) => sum + (entry.entryType === "expense" ? entry.amount : 0),
    0,
  ) ?? 0;
  const derivedTotalCredit = entriesData?.accepted.reduce(
    (sum, entry) =>
      sum +
      (entry.entryType === "investment" || entry.entryType === "sale"
        ? entry.amount
        : 0),
    0,
  ) ?? 0;
  const derivedTotalSales = entriesData?.accepted.reduce(
    (sum, entry) => sum + (entry.entryType === "sale" ? entry.amount : 0),
    0,
  ) ?? 0;
  const totalDebit = businessSummary?.totalDebit ?? derivedTotalDebit;
  const totalCredit = businessSummary?.totalCredit ?? derivedTotalCredit;
  const netBalance = businessSummary?.netBalance ?? totalCredit - totalDebit;
  const totalSales = businessSummary?.totalSales ?? derivedTotalSales;
  const totalExpenses = businessSummary?.totalExpenses ?? derivedTotalDebit;
  const approvedEquipment = [
    ...(equipmentData?.available ?? []),
    ...(equipmentData?.upcoming ?? []),
  ];
  const derivedTotalAssetValue = approvedEquipment.reduce(
    (sum, item) => sum + item.estimatedCost,
    0,
  );
  const derivedAvailableAssetValue = (equipmentData?.available ?? []).reduce(
    (sum, item) => sum + item.estimatedCost,
    0,
  );
  const derivedUpcomingAssetValue = (equipmentData?.upcoming ?? []).reduce(
    (sum, item) => sum + item.estimatedCost,
    0,
  );
  const totalAssetValue =
    businessSummary?.totalAssetValue ?? derivedTotalAssetValue;
  const availableAssetValue =
    businessSummary?.availableAssetValue ?? derivedAvailableAssetValue;
  const upcomingAssetValue =
    businessSummary?.upcomingAssetValue ?? derivedUpcomingAssetValue;
  const derivedOwnerSummaries = owners.map<OwnerSummary>((owner) => {
    const ownerEntries =
      entriesData?.accepted.filter((entry) => entry.ownerName === owner.name) ??
      [];
    const ownerEquipment = approvedEquipment.filter(
      (item) => item.ownerName === owner.name,
    );
    const investment = ownerEntries.reduce(
      (sum, entry) =>
        sum + (entry.entryType === "investment" ? entry.amount : 0),
      0,
    );
    const expense = ownerEntries.reduce(
      (sum, entry) => sum + (entry.entryType === "expense" ? entry.amount : 0),
      0,
    );
    const sale = ownerEntries.reduce(
      (sum, entry) => sum + (entry.entryType === "sale" ? entry.amount : 0),
      0,
    );
    const assetValue = ownerEquipment.reduce(
      (sum, item) => sum + item.estimatedCost,
      0,
    );

    return {
      ownerName: owner.name,
      investment,
      expense,
      sale,
      assetValue,
      netContribution: investment + sale + assetValue - expense,
    };
  });
  const ownerSummaries =
    businessSummary?.ownerSummaries ?? derivedOwnerSummaries;
  const hasSummaryFilters = Boolean(
    summaryOwnerFilter ||
      summaryTypeFilter !== "all" ||
      summaryStartDate ||
      summaryEndDate,
  );
  const summaryFilteredEntries = (entriesData?.accepted ?? []).filter(
    (entry) =>
      (!summaryOwnerFilter || entry.ownerName === summaryOwnerFilter) &&
      (summaryTypeFilter === "all" || entry.entryType === summaryTypeFilter) &&
      isDateInRange(entry.entryDate, summaryStartDate, summaryEndDate),
  );
  const summaryFilteredEquipment = approvedEquipment.filter(
    (item) =>
      (!summaryOwnerFilter || item.ownerName === summaryOwnerFilter) &&
      isDateInRange(item.targetDate, summaryStartDate, summaryEndDate),
  );
  const summaryFilteredOwnerRows = owners
    .filter((owner) => !summaryOwnerFilter || owner.name === summaryOwnerFilter)
    .map<OwnerSummary>((owner) => {
      const ownerEntries = summaryFilteredEntries.filter(
        (entry) => entry.ownerName === owner.name,
      );
      const ownerEquipment = summaryFilteredEquipment.filter(
        (item) => item.ownerName === owner.name,
      );
      const investment = ownerEntries.reduce(
        (sum, entry) =>
          sum + (entry.entryType === "investment" ? entry.amount : 0),
        0,
      );
      const expense = ownerEntries.reduce(
        (sum, entry) =>
          sum + (entry.entryType === "expense" ? entry.amount : 0),
        0,
      );
      const sale = ownerEntries.reduce(
        (sum, entry) => sum + (entry.entryType === "sale" ? entry.amount : 0),
        0,
      );
      const assetValue = ownerEquipment.reduce(
        (sum, item) => sum + item.estimatedCost,
        0,
      );

      return {
        ownerName: owner.name,
        investment,
        expense,
        sale,
        assetValue,
        netContribution: investment + sale + assetValue - expense,
      };
    });
  const summaryOwnerRows = hasSummaryFilters
    ? summaryFilteredOwnerRows
    : ownerSummaries;
  const totalOwnerInvestment = summaryOwnerRows.reduce(
    (sum, owner) => sum + owner.investment,
    0,
  );
  const totalOwnerAssetValue = summaryOwnerRows.reduce(
    (sum, owner) => sum + owner.assetValue,
    0,
  );
  const totalOwnerExpense = summaryOwnerRows.reduce(
    (sum, owner) => sum + owner.expense,
    0,
  );
  const totalOwnerSale = summaryOwnerRows.reduce(
    (sum, owner) => sum + owner.sale,
    0,
  );
  const totalOwnerNetContribution = summaryOwnerRows.reduce(
    (sum, owner) => sum + owner.netContribution,
    0,
  );
  const headerSummary = (
    <section className="metric-grid header-metric-grid" aria-label="Business summary">
      <button
        aria-label="Open approval requests"
        onClick={() => openShortcut("approvals")}
        type="button"
      >
        <span>Approval requests</span>
        <strong>{approvalRequestCount}</strong>
      </button>
      <button
        aria-label="Open accepted investment records"
        onClick={() => openShortcut("records")}
        type="button"
      >
        <span>Accepted investment records</span>
        <strong>{acceptedCount}</strong>
      </button>
      <button
        aria-label="Open accepted investment amount"
        onClick={() => openShortcut("records")}
        type="button"
      >
        <span>Accepted amount</span>
        <strong>Rs {totalAccepted.toFixed(2)}</strong>
      </button>
      <button
        aria-label="Open equipment items"
        onClick={() => openShortcut("equipment", "list")}
        type="button"
      >
        <span>Equipment items</span>
        <strong>{equipmentCount}</strong>
      </button>
    </section>
  );
  const notificationCenter = (
    <div className="notification-center">
      <button
        aria-expanded={isNotificationOpen}
        aria-label={`Notifications, ${unreadNotificationCount} unread message${
          unreadNotificationCount === 1 ? "" : "s"
        }`}
        className="bell-button"
        onClick={() => {
          setIsNotificationOpen((current) => !current);
          if (!isNotificationOpen) {
            void markNotificationsRead();
          }
        }}
        type="button"
      >
        <svg
          aria-hidden="true"
          fill="none"
          height="18"
          viewBox="0 0 24 24"
          width="18"
        >
          <path
            d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
          <path
            d="M13.73 21a2 2 0 0 1-3.46 0"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </svg>
        {unreadNotificationCount > 0 && (
          <span className="notification-count">{unreadNotificationCount}</span>
        )}
      </button>
      {isNotificationOpen && (
        <div className="notification-panel" role="status">
          <div className="notification-panel-heading">
            <strong>Notifications</strong>
            {notifications.length > 0 && (
              <button
                onClick={() => {
                  void clearNotifications();
                }}
                type="button"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="notification-list">
            {notifications.length ? (
              notifications.map((item) => (
                <article
                  className={`notification-item notification-item-${item.tone}`}
                  key={item.id}
                >
                  <div>
                    <span>{item.message}</span>
                    <small>{item.createdAt}</small>
                  </div>
                  <div className="notification-actions">
                    <button
                      onClick={() => openNotificationShortcut(item.message)}
                      type="button"
                    >
                      Open
                    </button>
                    <button
                      aria-label="Dismiss notification"
                      onClick={() => {
                        void dismissNotification(item.id);
                      }}
                      type="button"
                    >
                      X
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <p>No notifications yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );

  if (activeOwner) {
    return (
      <main className="app-shell">
        <section className="workspace-shell" aria-label="Owner workspace">
          <header className="workspace-header">
            <div className="header-intro">
              <p className="eyebrow">Owner portal</p>
              <h1>AgriBro</h1>
              <p className="intro">
                Signed in as {ownerProfile?.displayName || activeOwner}. Submit
                investment records, review approvals, and manage your account.
              </p>
            </div>
            {headerSummary}
            <div className="header-actions">
              <button
                aria-expanded={isMenuOpen}
                aria-label={isMenuOpen ? "Close workspace menu" : "Open workspace menu"}
                className="menu-toggle"
                onClick={() => setIsMenuOpen((current) => !current)}
                type="button"
              >
                <span />
                <span />
                <span />
              </button>
              <div className="owner-chip">
                <span>{ownerProfile?.displayName || activeOwner}</span>
                <small>{ownerProfile?.role || "Owner"}</small>
              </div>
              {notificationCenter}
            </div>
          </header>

          {isMenuOpen && (
            <button
              aria-label="Close workspace menu"
              className="menu-overlay"
              onClick={() => setIsMenuOpen(false)}
              type="button"
            />
          )}

          <nav
            className={`workspace-nav ${isMenuOpen ? "workspace-nav-open" : ""}`}
            aria-label="Workspace navigation"
          >
            <button
              aria-current={activeSection === "dashboard" ? "page" : undefined}
              className={activeSection === "dashboard" ? "nav-active" : ""}
              onClick={() => openShortcut("dashboard")}
              type="button"
            >
              Dashboard
            </button>
            <button
              aria-current={activeSection === "summary" ? "page" : undefined}
              className={activeSection === "summary" ? "nav-active" : ""}
              onClick={() => openShortcut("summary")}
              type="button"
            >
              Summary
            </button>
            <div className="nav-menu">
              <button
                className={
                  activeSection === "entries" || activeSection === "records"
                    ? "nav-active"
                    : ""
                }
                onClick={() => {
                  setActiveSection("entries");
                  setIsMenuOpen(false);
                }}
                type="button"
              >
                Investment Record
              </button>
              <div className="nav-menu-panel">
                {[
                  ["entries", "New investment record"],
                  ["records", `Accepted investment records (${acceptedCount})`],
                ].map(([section, label]) => (
                  <button
                    className={activeSection === section ? "subnav-active" : ""}
                    key={section}
                    onClick={() => {
                      setActiveSection(section as AppSection);
                      setIsMenuOpen(false);
                    }}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <button
              aria-current={activeSection === "approvals" ? "page" : undefined}
              className={`approval-nav-button ${
                activeSection === "approvals" ? "nav-active" : ""
              }`}
              onClick={() => {
                setActiveSection("approvals");
                setIsMenuOpen(false);
              }}
              type="button"
            >
              Approvals
              {approvalRequestCount > 0 && (
                <span className="nav-count">{approvalRequestCount}</span>
              )}
            </button>
            <div className="nav-menu">
              <button
                className={activeSection === "equipment" ? "nav-active" : ""}
                onClick={() => {
                  setActiveSection("equipment");
                  setActiveEquipmentSection("list");
                  setIsMenuOpen(false);
                }}
                type="button"
              >
                Equipment
              </button>
              <div className="nav-menu-panel">
                {[
                  ["list", `Equipment list (${equipmentCount})`],
                  ["add", "Add equipment"],
                ].map(([section, label]) => (
                  <button
                    className={
                      activeSection === "equipment" &&
                      activeEquipmentSection === section
                        ? "subnav-active"
                        : ""
                    }
                    key={section}
                    onClick={() => {
                      setActiveSection("equipment");
                      setActiveEquipmentSection(section as EquipmentSection);
                      setIsMenuOpen(false);
                    }}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="nav-menu">
              <button
                className={
                  activeSection === "account" || activeSection === "system"
                    ? "nav-active"
                    : ""
                }
                onClick={() => {
                  setActiveSection("account");
                  setIsMenuOpen(false);
                }}
                type="button"
              >
                Owner & System
              </button>
              <div className="nav-menu-panel">
                {[
                  ["account", "Owner account"],
                  ["system", "Database system"],
                ].map(([section, label]) => (
                  <button
                    className={activeSection === section ? "subnav-active" : ""}
                    key={section}
                    onClick={() => {
                      setActiveSection(section as AppSection);
                      setIsMenuOpen(false);
                    }}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <button
              className="logout-button"
              onClick={() => {
                setIsMenuOpen(false);
                logoutOwner();
              }}
              type="button"
            >
              Log out
            </button>
          </nav>

          {activeSection === "dashboard" && (
            <section className="content-panel dashboard-panel" aria-label="Dashboard">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Dashboard</p>
                  <h2>Business summary</h2>
                  <p>
                    Quick view of approvals, accepted records, debit, credit,
                    balance, and approved assets.
                  </p>
                </div>
                <span className="role-badge">Phase 4</span>
              </div>
              <div className="metric-grid dashboard-metric-grid">
                <button
                  aria-label="Open approval requests from dashboard"
                  onClick={() => openShortcut("approvals")}
                  type="button"
                >
                  <span>Approval requests</span>
                  <strong>{approvalRequestCount}</strong>
                </button>
                <button
                  aria-label="Open accepted investment records from dashboard"
                  onClick={() => openShortcut("records")}
                  type="button"
                >
                  <span>Accepted investment records</span>
                  <strong>{acceptedCount}</strong>
                </button>
                <button
                  aria-label="Open accepted amount from dashboard"
                  onClick={() => openShortcut("records")}
                  type="button"
                >
                  <span>Accepted amount</span>
                  <strong>Rs {totalAccepted.toFixed(2)}</strong>
                </button>
                <button
                  aria-label="Open equipment items from dashboard"
                  onClick={() => openShortcut("equipment", "list")}
                  type="button"
                >
                  <span>Equipment items</span>
                  <strong>{equipmentCount}</strong>
                </button>
              </div>
              <div className="metric-grid dashboard-finance-grid">
                <button
                  aria-label="Open debit records from dashboard"
                  onClick={() => openShortcut("records")}
                  type="button"
                >
                  <span>Total debit</span>
                  <strong>Rs {totalDebit.toFixed(2)}</strong>
                </button>
                <button
                  aria-label="Open credit records from dashboard"
                  onClick={() => openShortcut("records")}
                  type="button"
                >
                  <span>Total credit</span>
                  <strong>Rs {totalCredit.toFixed(2)}</strong>
                </button>
                <button
                  aria-label="Open net balance from dashboard"
                  onClick={() => openShortcut("records")}
                  type="button"
                >
                  <span>Net balance</span>
                  <strong>Rs {netBalance.toFixed(2)}</strong>
                </button>
                <button
                  aria-label="Open sales records from dashboard"
                  onClick={() => openShortcut("records")}
                  type="button"
                >
                  <span>Total sales</span>
                  <strong>Rs {totalSales.toFixed(2)}</strong>
                </button>
                <button
                  aria-label="Open expense records from dashboard"
                  onClick={() => openShortcut("records")}
                  type="button"
                >
                  <span>Total expenses</span>
                  <strong>Rs {totalExpenses.toFixed(2)}</strong>
                </button>
              </div>
              <div className="metric-grid dashboard-asset-grid">
                <button
                  aria-label="Open asset value from dashboard"
                  onClick={() => openShortcut("equipment", "list")}
                  type="button"
                >
                  <span>Total asset value</span>
                  <strong>Rs {totalAssetValue.toFixed(2)}</strong>
                </button>
                <button
                  aria-label="Open available asset value from dashboard"
                  onClick={() => openShortcut("equipment", "list")}
                  type="button"
                >
                  <span>Available asset value</span>
                  <strong>Rs {availableAssetValue.toFixed(2)}</strong>
                </button>
                <button
                  aria-label="Open upcoming asset value from dashboard"
                  onClick={() => openShortcut("equipment", "list")}
                  type="button"
                >
                  <span>Upcoming asset value</span>
                  <strong>Rs {upcomingAssetValue.toFixed(2)}</strong>
                </button>
              </div>
              <div className="owner-summary-panel">
                <div className="owner-summary-heading">
                  <div>
                    <h3>Owner summary</h3>
                    <span>Accepted records and approved assets only</span>
                  </div>
                  <button onClick={() => openShortcut("records")} type="button">
                    View records
                  </button>
                </div>
                <div className="owner-summary-grid">
                  {ownerSummaries.map((summary) => (
                    <article
                      className="owner-summary-card"
                      key={summary.ownerName}
                    >
                      <strong>{summary.ownerName}</strong>
                      <div>
                        <span>
                          Investment
                          <b>Rs {summary.investment.toFixed(2)}</b>
                        </span>
                        <span>
                          Expense
                          <b>Rs {summary.expense.toFixed(2)}</b>
                        </span>
                        <span>
                          Sale
                          <b>Rs {summary.sale.toFixed(2)}</b>
                        </span>
                        <span>
                          Asset value
                          <b>Rs {summary.assetValue.toFixed(2)}</b>
                        </span>
                        <span className="owner-net">
                          Net contribution
                          <b>Rs {summary.netContribution.toFixed(2)}</b>
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
              <div className="dashboard-actions">
                <button onClick={() => openShortcut("summary")} type="button">
                  Summary report
                </button>
                <button onClick={() => openShortcut("entries")} type="button">
                  New investment record
                </button>
                <button onClick={() => openShortcut("approvals")} type="button">
                  Review approvals
                </button>
                <button
                  onClick={() => openShortcut("equipment", "add")}
                  type="button"
                >
                  Add equipment
                </button>
              </div>
            </section>
          )}

          {activeSection === "summary" && (
            <section
              className="content-panel summary-panel"
              aria-label="Summary report"
            >
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Summary</p>
                  <h2>Business report</h2>
                  <p>
                    Read-only totals from accepted records and approved
                    equipment.
                  </p>
                </div>
                <span className="role-badge">Phase 6</span>
              </div>
              <div className="summary-filter-panel">
                <label>
                  Owner
                  <select
                    onChange={(event) => setSummaryOwnerFilter(event.target.value)}
                    value={summaryOwnerFilter}
                  >
                    <option value="">All owners</option>
                    {owners.map((owner) => (
                      <option key={owner.name} value={owner.name}>
                        {owner.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Record type
                  <select
                    onChange={(event) => setSummaryTypeFilter(event.target.value)}
                    value={summaryTypeFilter}
                  >
                    <option value="all">All records</option>
                    {Object.entries(entryTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  From
                  <input
                    onChange={(event) => setSummaryStartDate(event.target.value)}
                    type="date"
                    value={summaryStartDate}
                  />
                </label>
                <label>
                  To
                  <input
                    onChange={(event) => setSummaryEndDate(event.target.value)}
                    type="date"
                    value={summaryEndDate}
                  />
                </label>
                <button
                  onClick={() => {
                    setSummaryOwnerFilter("");
                    setSummaryTypeFilter("all");
                    setSummaryStartDate("");
                    setSummaryEndDate("");
                  }}
                  type="button"
                >
                  Clear filters
                </button>
              </div>
              <p className="summary-filter-note">
                Showing {summaryFilteredEntries.length} accepted record
                {summaryFilteredEntries.length === 1 ? "" : "s"} and{" "}
                {summaryFilteredEquipment.length} approved equipment item
                {summaryFilteredEquipment.length === 1 ? "" : "s"}
                {hasSummaryFilters ? " matching the filters." : " in this report."}
              </p>
              <div className="metric-grid dashboard-finance-grid">
                <button
                  aria-label="Open accepted investment records from summary"
                  onClick={() => openShortcut("records")}
                  type="button"
                >
                  <span>Owner investment</span>
                  <strong>Rs {totalOwnerInvestment.toFixed(2)}</strong>
                </button>
                <button
                  aria-label="Open sales records from summary"
                  onClick={() => openShortcut("records")}
                  type="button"
                >
                  <span>Total sales</span>
                  <strong>Rs {totalOwnerSale.toFixed(2)}</strong>
                </button>
                <button
                  aria-label="Open expense records from summary"
                  onClick={() => openShortcut("records")}
                  type="button"
                >
                  <span>Total expenses</span>
                  <strong>Rs {totalOwnerExpense.toFixed(2)}</strong>
                </button>
                <button
                  aria-label="Open approved equipment from summary"
                  onClick={() => openShortcut("equipment", "list")}
                  type="button"
                >
                  <span>Asset value</span>
                  <strong>Rs {totalOwnerAssetValue.toFixed(2)}</strong>
                </button>
                <button
                  aria-label="Open net contribution from summary"
                  onClick={() => openShortcut("records")}
                  type="button"
                >
                  <span>Net contribution</span>
                  <strong>Rs {totalOwnerNetContribution.toFixed(2)}</strong>
                </button>
              </div>
              <div className="summary-breakdown">
                <div className="summary-table-wrap">
                  <table className="summary-table">
                    <thead>
                      <tr>
                        <th>Owner</th>
                        <th>Investment</th>
                        <th>Sale</th>
                        <th>Expense</th>
                        <th>Asset value</th>
                        <th>Net contribution</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryOwnerRows.map((summary) => (
                        <tr key={summary.ownerName}>
                          <td>{summary.ownerName}</td>
                          <td>Rs {summary.investment.toFixed(2)}</td>
                          <td>Rs {summary.sale.toFixed(2)}</td>
                          <td>Rs {summary.expense.toFixed(2)}</td>
                          <td>Rs {summary.assetValue.toFixed(2)}</td>
                          <td>Rs {summary.netContribution.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="summary-actions">
                  <button onClick={() => openShortcut("records")} type="button">
                    Review accepted records
                  </button>
                  <button
                    onClick={() => openShortcut("equipment", "list")}
                    type="button"
                  >
                    Review equipment
                  </button>
                  <button onClick={() => openShortcut("approvals")} type="button">
                    Review approvals
                  </button>
                </div>
              </div>
            </section>
          )}

          {activeSection === "entries" && (
            <section className="content-panel" aria-label="Investment record form">
              <div>
                <p className="eyebrow">Investment record</p>
                <h2>Add record for approval</h2>
                <p>
                  Real records stay pending until the submitter and one more
                  owner accept them.
                </p>
              </div>
              <form className="entry-form" onSubmit={submitEntry}>
                <label>
                  Entry type
                  <select
                    name="entryType"
                    onChange={(event) => {
                      setSelectedEntryType(event.target.value);
                      setSelectedCategory("");
                    }}
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
                  <select
                    name="category"
                    onChange={(event) => setSelectedCategory(event.target.value)}
                    required
                    value={selectedCategory}
                  >
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
                  <input
                    defaultValue={today}
                    name="entryDate"
                    required
                    type="date"
                  />
                </label>
                <label>
                  Quantity
                  <input name="quantity" placeholder="Optional" />
                </label>
                <label className="entry-note">
                  Note
                  <input name="note" placeholder="Optional details" />
                </label>
                {isEquipmentContribution && (
                  <div className="linked-module-panel">
                    <div>
                      <strong>Equipment contribution selected</strong>
                      <span>
                        Link this investment record to the Add equipment module
                        so the asset is also saved in the equipment database.
                      </span>
                    </div>
                    <button
                      onClick={(event) =>
                        linkEquipmentContribution(event.currentTarget.form)
                      }
                      type="button"
                    >
                      Add equipment details
                    </button>
                  </div>
                )}
                <button disabled={isSavingEntry} type="submit">
                  Submit record
                </button>
              </form>
            </section>
          )}

          {activeSection === "approvals" && (
            <section className="content-panel" aria-label="Approval module">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Approval module</p>
                  <h2>All add and remove requests</h2>
                  <p>
                    {approvalRequestCount
                      ? `${approvalRequestCount} request needs owner approval.`
                      : "No entry or removal approvals are waiting."}
                  </p>
                </div>
                <span className="role-badge">2 approvals required</span>
              </div>
              <div className="approval-module">
                <div className="approval-group">
                  <div className="approval-group-heading">
                    <h3>Entry approvals</h3>
                    <span>{pendingCount} pending</span>
                  </div>
                  <div className="entry-list">
                    {entriesData?.pending.length ? (
                      entriesData.pending.map((entry) => (
                        <article className="entry-card" key={entry.id}>
                          <div>
                            <strong>
                              {entryTypeLabels[entry.entryType]} -{" "}
                              {entry.category}
                            </strong>
                            <span>
                              Rs {entry.amount.toFixed(2)} by {entry.ownerName} on{" "}
                              {entry.entryDate}
                            </span>
                            {entry.quantity && (
                              <span>Quantity: {entry.quantity}</span>
                            )}
                            {entry.note && <span>Note: {entry.note}</span>}
                            <span>
                              Submitted by {entry.createdBy}. Approved by{" "}
                              {entry.approvedBy.length
                                ? entry.approvedBy.join(", ")
                                : "none"}
                              .
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
                      ))
                    ) : (
                      <p>No entry approvals pending.</p>
                    )}
                  </div>
                </div>
                <div className="approval-group equipment-add-approval-group">
                  <div className="approval-group-heading">
                    <h3>Equipment addition approvals</h3>
                    <span>{equipmentAddRequestCount} pending</span>
                  </div>
                  <div className="entry-list">
                    {equipmentData?.additionRequests.length ? (
                      equipmentData.additionRequests.map((request) => {
                        const hasApprovedAddition =
                          request.approvedBy.includes(activeOwner);

                        return (
                          <article className="entry-card" key={request.id}>
                            <div>
                              <strong>{request.name}</strong>
                              <span>
                                {request.status === "upcoming"
                                  ? "Upcoming equipment"
                                  : "Available equipment"}{" "}
                                | Qty {request.quantity} | Rs{" "}
                                {request.estimatedCost.toFixed(2)}
                              </span>
                              <span>Responsible: {request.ownerName}</span>
                              {request.targetDate && (
                                <span>Date: {request.targetDate}</span>
                              )}
                              {request.note && <span>Note: {request.note}</span>}
                              <span>
                                Submitted by {request.createdBy}. Approved by{" "}
                                {request.approvedBy.length
                                  ? request.approvedBy.join(", ")
                                  : "none"}
                                .
                              </span>
                            </div>
                            <div className="approval-actions">
                              <span>{request.approvalCount}/2 accepted</span>
                              <button
                                disabled={
                                  isApprovingEquipmentAdd === request.id ||
                                  hasApprovedAddition
                                }
                                onClick={() => approveEquipmentAddition(request.id)}
                                type="button"
                              >
                                {hasApprovedAddition ? "Accepted" : "Accept"}
                              </button>
                            </div>
                          </article>
                        );
                      })
                    ) : (
                      <p>No equipment addition approvals pending.</p>
                    )}
                  </div>
                </div>
                <div className="approval-group remove-approval-group">
                  <div className="approval-group-heading">
                    <h3>Removal approvals</h3>
                    <span>{deletionRequestCount} pending</span>
                  </div>
                  <div className="entry-list">
                    {equipmentData?.deletionRequests.length ? (
                      equipmentData.deletionRequests.map((request) => {
                        const hasApprovedRemoval =
                          request.approvedBy.includes(activeOwner);

                        return (
                          <article className="entry-card delete-request-card" key={request.id}>
                            <div>
                              <strong>{request.itemName}</strong>
                              <span>Equipment removal request</span>
                              <span>Requested by {request.requestedBy}</span>
                              <span>
                                Approved by{" "}
                                {request.approvedBy.length
                                  ? request.approvedBy.join(", ")
                                  : "none"}
                                .
                              </span>
                            </div>
                            <div className="approval-actions">
                              <span>{request.approvalCount}/2 accepted</span>
                              <button
                                className="danger-button"
                                disabled={
                                  !request.equipmentId ||
                                  isDeletingEquipment === request.equipmentId ||
                                  hasApprovedRemoval
                                }
                                onClick={() =>
                                  request.equipmentId
                                    ? requestDeleteEquipment(request.equipmentId)
                                    : undefined
                                }
                                type="button"
                              >
                                {hasApprovedRemoval ? "Accepted" : "Accept remove"}
                              </button>
                            </div>
                          </article>
                        );
                      })
                    ) : (
                      <p>No removal approvals pending.</p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeSection === "records" && (
            <section
              className="content-panel"
              aria-label="Accepted investment records"
            >
              <div>
                <p className="eyebrow">Accepted database</p>
                <h2>Accepted investment records</h2>
                <p>
                  These records have at least 2 owner approvals and are ready
                  for reports.
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
                  <p>No accepted investment records yet.</p>
                )}
              </div>
            </section>
          )}

          {activeSection === "equipment" && (
            <section className="content-panel" aria-label="Equipment register">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Equipment register</p>
                  <h2>Professional equipment database</h2>
                  <p>
                    Use the Equipment menu to request new items or view the
                    approved equipment list.
                  </p>
                </div>
                <span className="role-badge">
                  {deletionRequestCount} pending delete
                  {deletionRequestCount === 1 ? "" : "s"}
                </span>
              </div>
              {activeEquipmentSection === "add" && (
                <form
                  className="entry-form equipment-form"
                  key={equipmentDraftKey}
                  onSubmit={submitEquipment}
                >
                  <div className="form-section-title">
                    <h3>Request equipment addition</h3>
                    <p>
                      New equipment needs 2 owner approvals before it enters the
                      equipment list.
                    </p>
                  </div>
                  {equipmentDraft && (
                    <div className="linked-module-panel linked-module-panel-full">
                      <div>
                        <strong>Linked from equipment contribution</strong>
                        <span>
                          Amount, owner, date, quantity, and note were copied
                          from the investment record.
                        </span>
                      </div>
                    </div>
                  )}
                  <label>
                    Equipment name
                    <input
                      name="equipmentName"
                      placeholder="Water pump, tiller, sprayer"
                      required
                    />
                  </label>
                  <label>
                    Status
                    <select name="equipmentStatus" defaultValue="available">
                      <option value="available">Available</option>
                      <option value="upcoming">Upcoming</option>
                    </select>
                  </label>
                  <label>
                    Quantity
                    <input
                      defaultValue={equipmentDraft?.quantity || "1"}
                      min="1"
                      name="equipmentQuantity"
                      required
                      step="1"
                      type="number"
                    />
                  </label>
                  <label>
                    Cost / estimate
                    <input
                      defaultValue={equipmentDraft?.estimatedCost || ""}
                      min="0"
                      name="equipmentCost"
                      placeholder="0.00"
                      step="0.01"
                      type="number"
                    />
                  </label>
                  <label>
                    Date
                    <input
                      defaultValue={equipmentDraft?.targetDate || ""}
                      name="equipmentDate"
                      type="date"
                    />
                  </label>
                  <label>
                    Responsible owner
                    <select
                      name="equipmentOwner"
                      defaultValue={equipmentDraft?.ownerName || activeOwner}
                    >
                      {owners.map((owner) => (
                        <option key={owner.name} value={owner.name}>
                          {owner.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="entry-note">
                    Note
                    <input
                      defaultValue={equipmentDraft?.note || ""}
                      name="equipmentNote"
                      placeholder="Condition, supplier, purpose, or next action"
                    />
                  </label>
                  <label className="image-field upload-card">
                    Photo
                    <input
                      accept="image/*"
                      capture="environment"
                      name="equipmentImage"
                      onChange={chooseEquipmentImage}
                      type="file"
                    />
                    <span>Take picture or upload image, max 1.5MB.</span>
                  </label>
                  {equipmentImage && (
                    <div className="image-preview">
                      <img alt="Selected equipment preview" src={equipmentImage} />
                      <button
                        onClick={() => setEquipmentImage("")}
                        type="button"
                      >
                        Remove photo
                      </button>
                    </div>
                  )}
                  <button disabled={isSavingEquipment} type="submit">
                    Submit for approval
                  </button>
                </form>
              )}
              {activeEquipmentSection === "list" && (
                <>
                  <div className="search-row">
                    <label>
                      Search equipment
                      <input
                        onChange={(event) =>
                          setEquipmentSearch(event.target.value)
                        }
                        placeholder="Search by name, owner, note, or date"
                        type="search"
                        value={equipmentSearch}
                      />
                    </label>
                    <span>
                      Showing {visibleEquipmentCount} of {equipmentCount} items
                    </span>
                  </div>
                  <div className="equipment-grid">
                    <div className="equipment-list-panel">
                      <h3>Available equipment</h3>
                      <p className="result-count">
                        {visibleAvailableEquipment.length} result
                        {visibleAvailableEquipment.length === 1 ? "" : "s"}
                      </p>
                      <div className="entry-list">
                        {visibleAvailableEquipment.length ? (
                          visibleAvailableEquipment.map(renderEquipmentCard)
                        ) : (
                          <p>No available equipment saved yet.</p>
                        )}
                      </div>
                    </div>
                    <div className="equipment-list-panel">
                      <h3>Upcoming equipment</h3>
                      <p className="result-count">
                        {visibleUpcomingEquipment.length} result
                        {visibleUpcomingEquipment.length === 1 ? "" : "s"}
                      </p>
                      <div className="entry-list">
                        {visibleUpcomingEquipment.length ? (
                          visibleUpcomingEquipment.map(renderEquipmentCard)
                        ) : (
                          <p>No upcoming equipment saved yet.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </section>
          )}

          {activeSection === "account" && (
            <section className="account-grid" aria-label="Owner account">
              <div className="content-panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Profile</p>
                    <h2>{ownerProfile?.displayName || activeOwner}</h2>
                    <p>
                      Keep owner contact details separate from investment record
                      records.
                    </p>
                  </div>
                  <span className="role-badge">
                    {ownerProfile?.role || "Owner"}
                  </span>
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
                      profileMessage.includes("saved")
                        ? "form-success"
                        : "form-error"
                    }
                  >
                    {profileMessage}
                  </p>
                )}
              </div>
              <div className="content-panel security-panel">
                <div>
                  <p className="eyebrow">Secure area</p>
                  <h2>Change PIN</h2>
                  <p>
                    Security settings are kept away from daily entry work. Use
                    this only when the owner is updating their own PIN.
                  </p>
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
              </div>
            </section>
          )}

          {activeSection === "system" && (
            <section className="content-panel" aria-label="Database status">
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
                  Configured:{" "}
                  <strong>{databaseStatus?.configured ? "Yes" : "No"}</strong>
                </span>
                <span>
                  Connected:{" "}
                  <strong>{databaseStatus?.connected ? "Yes" : "No"}</strong>
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
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="login-shell">
      <div className="login-notification-center">{notificationCenter}</div>
      <section className="login-panel" aria-label="Owner login">
        <div className="login-copy">
          <p className="eyebrow">Private owner portal</p>
          <h1>AgriBro</h1>
          <p className="intro">
            Secure access for the four owners to record investments, expenses,
            sales, investment records, and approvals.
          </p>
        </div>
        <div className="auth-stack">
          <form className="login-form auth-card" onSubmit={loginOwner}>
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
            className="login-form auth-card secondary-auth"
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
                  recoveryMessage.includes("reset")
                    ? "form-success"
                    : "form-error"
                }
              >
                {recoveryMessage}
              </p>
            )}
            <button type="submit">Reset PIN</button>
          </form>
        </div>
      </section>
    </main>
  );
}
