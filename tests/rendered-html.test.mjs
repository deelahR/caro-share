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
    changePinRoute,
    entriesRoute,
    entriesApproveRoute,
    equipmentRoute,
    recoverPinRoute,
    profileRoute,
    postgres,
    layout,
    packageJson,
    readme,
    renderConfig,
  ] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/auth/login/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/auth/change-pin/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/entries/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/entries/approve/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/equipment/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/auth/recover-pin/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/owners/profile/route.ts", import.meta.url), "utf8"),
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
  assert.match(page, /\/api\/auth\/change-pin/);
  assert.match(page, /\/api\/auth\/recover-pin/);
  assert.match(page, /\/api\/owners\/profile/);
  assert.match(page, /\/api\/entries/);
  assert.match(page, /\/api\/entries\/approve/);
  assert.match(page, /\/api\/equipment/);
  assert.match(page, /Owner profile/);
  assert.match(page, /Change PIN/);
  assert.match(page, /Secure area/);
  assert.match(page, /workspace-nav/);
  assert.match(page, /notificationCenter/);
  assert.match(page, /bell-button/);
  assert.match(page, /notification-panel/);
  assert.match(page, /Clear all/);
  assert.match(page, /Recover PIN/);
  assert.match(page, /Add entry for approval/);
  assert.match(page, /Approval requests/);
  assert.match(page, /Approval module/);
  assert.match(page, /All add and remove requests/);
  assert.match(page, /Add requests/);
  assert.match(page, /Remove requests/);
  assert.match(page, /approvalRequestCount/);
  assert.match(page, /Equipment register/);
  assert.match(page, /Professional equipment database/);
  assert.match(page, /Search equipment/);
  assert.match(page, /visibleAvailableEquipment/);
  assert.match(page, /status-pill/);
  assert.match(page, /activeEquipmentSection/);
  assert.match(page, /Equipment list/);
  assert.match(page, /Add equipment/);
  assert.match(page, /Request delete/);
  assert.match(page, /requestDeleteEquipment/);
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
  assert.match(changePinRoute, /changeOwnerPin/);
  assert.match(entriesRoute, /createBusinessEntry/);
  assert.match(entriesRoute, /listBusinessEntries/);
  assert.match(entriesApproveRoute, /approveBusinessEntry/);
  assert.match(equipmentRoute, /createEquipmentItem/);
  assert.match(equipmentRoute, /listEquipment/);
  assert.match(equipmentRoute, /requestEquipmentDeletion/);
  assert.match(equipmentRoute, /DELETE/);
  assert.match(recoverPinRoute, /recoverOwnerPin/);
  assert.match(profileRoute, /getOwnerProfile/);
  assert.match(profileRoute, /updateOwnerProfile/);
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
  assert.match(postgres, /equipment_delete_requests/);
  assert.match(postgres, /equipment_delete_approvals/);
  assert.match(postgres, /image_data/);
  assert.match(postgres, /listEquipment/);
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
