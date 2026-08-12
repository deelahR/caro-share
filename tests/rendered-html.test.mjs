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
  assert.match(html, /Choose owner/);
  assert.match(html, /Temporary owner PINs/);
  assert.match(html, /Anish/);
  assert.match(html, /Anoup/);
  assert.match(html, /Shivam/);
  assert.match(html, /Inben/);
  assert.match(html, /1111/);
  assert.doesNotMatch(
    html,
    /Total investment|Add expense|Add sale|Land 1|Land 2|Profit due|Tomato early batch|Seeds and trays/,
  );
});

test("removes starter preview code and documents Render deployment", async () => {
  const [page, layout, packageJson, readme, renderConfig] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../README.md", import.meta.url), "utf8"),
    readFile(new URL("../render.yaml", import.meta.url), "utf8"),
  ]);

  assert.match(page, /AgriBro/);
  assert.match(page, /ownerSessionKey/);
  assert.match(page, /loginOwner/);
  assert.match(page, /logoutOwner/);
  assert.match(page, /Database system/);
  assert.match(page, /\/api\/database/);
  assert.doesNotMatch(
    page,
    /splitMode|startingData|Total investment|Add expense|Add sale|Tomato early batch|Leafy greens|Seeds and trays|North plot|South plot/,
  );
  assert.match(layout, /title:\s*"AgriBro"/);
  assert.doesNotMatch(layout, /Starter Project|codex-preview|_sites-preview/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.match(packageJson, /"pg"/);
  assert.match(readme, /Deploy on Render/);
  assert.match(readme, /PostgreSQL database named `agribro-db`/);
  assert.match(renderConfig, /type:\s*web/);
  assert.match(renderConfig, /runtime:\s*node/);
  assert.match(renderConfig, /DATABASE_URL/);
  assert.match(renderConfig, /fromDatabase/);
  assert.match(renderConfig, /name:\s*agribro-db/);
  assert.match(renderConfig, /buildCommand:\s*npm ci --include=dev && npm run build/);
  assert.match(renderConfig, /startCommand:\s*npm run start/);

  await assert.rejects(
    access(new URL("app/_sites-preview/SkeletonPreview.tsx", projectRoot)),
  );
  await assert.rejects(
    access(new URL("app/_sites-preview/preview.css", projectRoot)),
  );
});
