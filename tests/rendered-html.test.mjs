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

test("server-renders the Grow Ledger dashboard", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Grow Ledger<\/title>/i);
  assert.match(html, /Vegetable farming management/);
  assert.match(html, /Total investment/);
  assert.match(html, /Sales received/);
  assert.match(html, /Expenses paid/);
  assert.match(html, /Current profit/);
  assert.match(html, /Partners and profit share/);
  assert.match(html, /Anish/);
  assert.match(html, /Anoup/);
  assert.match(html, /Shivam/);
  assert.match(html, /Inben/);
  assert.match(html, /Land 1/);
  assert.match(html, /Land 2/);
  assert.match(html, /Add expense/);
  assert.match(html, /Add sale/);
  assert.match(html, /Rs\s*0/);
  assert.match(html, /No records yet\./);
  assert.doesNotMatch(html, /Tomato early batch|Leafy greens|Seeds and trays/);
});

test("removes starter preview code and documents Render deployment", async () => {
  const [page, layout, packageJson, readme, renderConfig] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../README.md", import.meta.url), "utf8"),
    readFile(new URL("../render.yaml", import.meta.url), "utf8"),
  ]);

  assert.match(page, /Grow Ledger/);
  assert.match(page, /splitMode/);
  assert.match(page, /farmledger-data-v2/);
  assert.doesNotMatch(page, /Tomato early batch|Leafy greens|Seeds and trays|North plot|South plot/);
  assert.match(layout, /title:\s*"Grow Ledger"/);
  assert.doesNotMatch(layout, /Starter Project|codex-preview|_sites-preview/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.match(readme, /Deploy on Render/);
  assert.match(renderConfig, /type:\s*web/);
  assert.match(renderConfig, /runtime:\s*node/);
  assert.match(renderConfig, /buildCommand:\s*npm ci --include=dev && npm run build/);
  assert.match(renderConfig, /startCommand:\s*npm run start/);

  await assert.rejects(
    access(new URL("app/_sites-preview/SkeletonPreview.tsx", projectRoot)),
  );
  await assert.rejects(
    access(new URL("app/_sites-preview/preview.css", projectRoot)),
  );
});
