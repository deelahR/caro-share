import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the owner login gate", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>AgriBro<\/title>/i);
  assert.match(html, /Private owner portal/);
  assert.match(html, /Owner login/);
  assert.match(html, /Recover PIN/);
  assert.match(html, /Choose owner/);
  assert.match(html, /Secure access/);
  assert.match(html, /Anish/);
  assert.match(html, /Anoup/);
  assert.match(html, /Shivam/);
  assert.match(html, /Inben/);
  assert.doesNotMatch(html, /Initial setup PINs|Initial recovery codes|1111|ANISH-2026/);
  assert.doesNotMatch(
    html,
    /Total investment|Add expense|Add sale|Land 1|Land 2|Profit due|Tomato early batch|Seeds and trays/,
  );
});

test("removes starter preview code and documents Render deployment", async () => {
  const [
    page,
    authRoute,
    authSession,
    changePinRoute,
    logoutRoute,
    entriesRoute,
    entriesApproveRoute,
    equipmentRoute,
    notificationsRoute,
    summaryRoute,
    recoverPinRoute,
    profileRoute,
    globalsCss,
    postgres,
    layout,
    packageJson,
    readme,
    renderConfig,
  ] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/auth/login/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/auth/owner-session.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/auth/change-pin/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/auth/logout/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/entries/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/entries/approve/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/equipment/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/notifications/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/summary/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/auth/recover-pin/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/owners/profile/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../db/postgres.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../README.md", import.meta.url), "utf8"),
    readFile(new URL("../render.yaml", import.meta.url), "utf8"),
  ]);

  assert.match(page, /AgriBro/);
  assert.match(page, /ownerSessionKey/);
  assert.match(page, /loginOwner/);
  assert.match(page, /logoutOwner/);
  assert.match(page, /\/api\/auth\/login/);
  assert.match(page, /\/api\/auth\/logout/);
  assert.match(page, /\/api\/auth\/change-pin/);
  assert.match(page, /\/api\/auth\/recover-pin/);
  assert.match(page, /\/api\/owners\/profile/);
  assert.match(page, /\/api\/entries/);
  assert.match(page, /\/api\/entries\/approve/);
  assert.match(page, /\/api\/equipment/);
  assert.match(page, /\/api\/summary/);
  assert.match(page, /Owner profile/);
  assert.match(page, /Change PIN/);
  assert.match(page, /Secure area/);
  assert.match(page, /workspace-nav/);
  assert.match(page, /menu-toggle/);
  assert.match(page, /menu-overlay/);
  assert.match(page, /workspace-nav-open/);
  assert.match(page, /Investment Record/);
  assert.match(page, /isEquipmentContribution/);
  assert.match(page, /linkEquipmentContribution/);
  assert.match(page, /Equipment contribution selected/);
  assert.match(page, /Add equipment details/);
  assert.match(page, /Linked from equipment contribution/);
  assert.match(page, /Owner & System/);
  assert.doesNotMatch(page, /module-overview/);
  assert.doesNotMatch(page, /New records and accepted records/);
  assert.doesNotMatch(page, /Profiles, security, and database/);
  assert.match(page, /notificationCenter/);
  assert.match(page, /headerSummary/);
  assert.match(page, /loadBusinessSummary/);
  assert.match(page, /businessSummary/);
  assert.match(page, /header-intro/);
  assert.match(page, /header-actions/);
  assert.match(page, /header-metric-grid/);
  assert.match(page, /Business summary/);
  assert.match(page, /bell-button/);
  assert.match(page, /notification-panel/);
  assert.match(page, /Clear all/);
  assert.match(page, /loadNotifications/);
  assert.match(page, /clearNotifications/);
  assert.match(page, /dismissNotification/);
  assert.match(page, /markNotificationsRead/);
  assert.match(page, /unreadNotificationCount/);
  assert.match(page, /setInterval/);
  assert.match(page, /30_000/);
  assert.match(page, /\/api\/notifications/);
  assert.match(page, /Recover PIN/);
  assert.match(page, /Add record for approval/);
  assert.match(page, /Approval requests/);
  assert.match(page, /Approval module/);
  assert.match(page, /All add and remove requests/);
  assert.match(page, /Entry approvals/);
  assert.match(page, /Equipment addition approvals/);
  assert.match(page, /equipmentAddRequestCount/);
  assert.match(page, /approveEquipmentAddition/);
  assert.match(page, /Removal approvals/);
  assert.match(page, /approvalRequestCount/);
  assert.match(page, /Equipment register/);
  assert.match(page, /Professional equipment database/);
  assert.match(page, /Search equipment/);
  assert.match(page, /visibleAvailableEquipment/);
  assert.match(page, /status-pill/);
  assert.match(page, /activeEquipmentSection/);
  assert.match(page, /Equipment list/);
  assert.match(page, /Add equipment/);
  assert.match(page, /Request equipment addition/);
  assert.match(page, /Submit for approval/);
  assert.match(page, /Removal approval pending/);
  assert.match(page, /Remove item/);
  assert.match(page, /requestDeleteEquipment/);
  assert.doesNotMatch(page, /Approve delete|Approved delete|Request delete/);
  assert.match(page, /nav-menu/);
  assert.match(page, /upload-card/);
  assert.match(page, /capture="environment"/);
  assert.match(page, /2 owner approvals/);
  assert.match(page, /Database system/);
  assert.match(page, /\/api\/database/);
  assert.doesNotMatch(
    page,
    /pin:\s*"1111"|splitMode|startingData|Total investment|Add expense|Add sale|Tomato early batch|Leafy greens|Seeds and trays|North plot|South plot/,
  );
  assert.match(authRoute, /authenticateOwner/);
  assert.match(authRoute, /ownerSessionHeader/);
  assert.match(authRoute, /Set-Cookie/);
  assert.match(authSession, /createHmac/);
  assert.match(authSession, /HttpOnly/);
  assert.match(authSession, /SameSite=Strict/);
  assert.match(authSession, /getSessionOwner/);
  assert.match(logoutRoute, /clearOwnerSessionHeader/);
  assert.match(changePinRoute, /changeOwnerPin/);
  assert.match(entriesRoute, /createBusinessEntry/);
  assert.match(entriesRoute, /listBusinessEntries/);
  assert.match(entriesApproveRoute, /approveBusinessEntry/);
  assert.match(equipmentRoute, /createEquipmentAddRequest/);
  assert.match(equipmentRoute, /approveEquipmentAddRequest/);
  assert.match(equipmentRoute, /listEquipment/);
  assert.match(equipmentRoute, /requestEquipmentDeletion/);
  assert.match(equipmentRoute, /DELETE/);
  assert.match(notificationsRoute, /listOwnerNotifications/);
  assert.match(notificationsRoute, /getSessionOwner/);
  assert.match(notificationsRoute, /markOwnerNotificationsRead/);
  assert.match(notificationsRoute, /dismissOwnerNotification/);
  assert.match(notificationsRoute, /clearOwnerNotifications/);
  assert.match(notificationsRoute, /PATCH/);
  assert.match(notificationsRoute, /DELETE/);
  assert.match(summaryRoute, /getBusinessSummary/);
  assert.match(summaryRoute, /ensureDatabaseInitialized/);
  assert.match(recoverPinRoute, /recoverOwnerPin/);
  assert.match(profileRoute, /getOwnerProfile/);
  assert.match(profileRoute, /updateOwnerProfile/);
  assert.match(globalsCss, /@media \(max-width: 760px\)/);
  assert.match(globalsCss, /overflow-x: hidden/);
  assert.match(globalsCss, /\.workspace-shell\s*{[\s\S]*grid-template-columns: 230px minmax\(0, 1fr\)/);
  assert.match(globalsCss, /\.workspace-nav\s*{[\s\S]*position: sticky/);
  assert.match(globalsCss, /\.workspace-shell > \.content-panel/);
  assert.match(globalsCss, /@media \(max-width: 760px\)[\s\S]*\.workspace-shell\s*{[\s\S]*grid-template-columns: 1fr/);
  assert.match(globalsCss, /\.menu-toggle\s*{[\s\S]*display: none/);
  assert.match(globalsCss, /\.menu-overlay\s*{[\s\S]*display: none/);
  assert.match(globalsCss, /@media \(max-width: 760px\)[\s\S]*\.menu-toggle\s*{[\s\S]*display: grid/);
  assert.match(globalsCss, /@media \(max-width: 760px\)[\s\S]*\.workspace-nav\s*{[\s\S]*position: fixed/);
  assert.match(globalsCss, /@media \(max-width: 760px\)[\s\S]*\.workspace-nav-open\s*{[\s\S]*translateX\(0\)/);
  assert.match(globalsCss, /@media \(max-width: 430px\)/);
  assert.match(globalsCss, /\.login-form button,[\s\S]*\.entry-form button\s*{[\s\S]*width: 100%/);
  assert.match(globalsCss, /\.notification-panel\s*{[\s\S]*position: fixed/);
  assert.match(globalsCss, /\.equipment-card-actions/);
  assert.match(globalsCss, /\.header-metric-grid/);
  assert.doesNotMatch(globalsCss, /module-overview/);
  assert.match(postgres, /scryptSync/);
  assert.match(postgres, /timingSafeEqual/);
  assert.match(postgres, /pin_hash/);
  assert.match(postgres, /pin_salt/);
  assert.match(postgres, /recovery_hash/);
  assert.match(postgres, /recovery_salt/);
  assert.match(postgres, /changeOwnerPin/);
  assert.match(postgres, /recoverOwnerPin/);
  assert.match(postgres, /updateOwnerProfile/);
  assert.match(postgres, /entryCategories/);
  assert.match(postgres, /business_entries/);
  assert.match(postgres, /entry_approvals/);
  assert.match(postgres, /equipment_items/);
  assert.match(postgres, /equipment_add_requests/);
  assert.match(postgres, /equipment_add_approvals/);
  assert.match(postgres, /equipment_delete_requests/);
  assert.match(postgres, /equipment_delete_approvals/);
  assert.match(postgres, /owner_notifications/);
  assert.match(postgres, /initializationPromise/);
  assert.match(postgres, /ensureDatabaseInitialized/);
  assert.match(postgres, /getBusinessSummary/);
  assert.match(postgres, /createOwnerNotification/);
  assert.match(postgres, /createOtherOwnerNotifications/);
  assert.match(postgres, /listOwnerNotifications/);
  assert.match(postgres, /markOwnerNotificationsRead/);
  assert.match(postgres, /dismissOwnerNotification/);
  assert.match(postgres, /clearOwnerNotifications/);
  assert.doesNotMatch(postgres, /Initialized AgriBro database/);
  assert.match(postgres, /image_data/);
  assert.match(postgres, /listEquipment/);
  assert.match(postgres, /createEquipmentAddRequest/);
  assert.match(postgres, /approveEquipmentAddRequest/);
  assert.match(postgres, /createEquipmentItem/);
  assert.match(postgres, /requestEquipmentDeletion/);
  assert.match(postgres, /approvalCount >= 2/);
  assert.match(postgres, /select id, created_by/);
  assert.match(postgres, /approvalCount: 1/);
  assert.match(layout, /title:\s*"AgriBro"/);
  assert.doesNotMatch(layout, /Starter Project|codex-preview|_sites-preview/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.match(packageJson, /"pg"/);
  assert.match(readme, /Deploy on Render/);
  assert.match(readme, /`DATABASE_URL` environment/);
  assert.match(renderConfig, /type:\s*web/);
  assert.match(renderConfig, /runtime:\s*node/);
  assert.match(renderConfig, /DATABASE_URL/);
  assert.match(renderConfig, /sync:\s*false/);
  assert.match(renderConfig, /buildCommand:\s*npm ci --include=dev && npm run build/);
  assert.match(renderConfig, /startCommand:\s*npm run start/);

  await assert.rejects(
    access(new URL("app/_sites-preview/SkeletonPreview.tsx", projectRoot)),
  );
  await assert.rejects(
    access(new URL("app/_sites-preview/preview.css", projectRoot)),
  );
});
