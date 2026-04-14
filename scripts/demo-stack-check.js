#!/usr/bin/env node
/**
 * Demo / thesis smoke check for the active microservices stack (gateway-first).
 *
 * Usage:
 *   node scripts/demo-stack-check.js
 *
 * Environment:
 *   GATEWAY_URL (default http://localhost:8080)
 *   ASSISTANT_REINDEX_API_KEY (optional; if set, runs POST /api/assistant/reindex)
 */

const GATEWAY = process.env.GATEWAY_URL || "http://localhost:8080";
const REINDEX_KEY = process.env.ASSISTANT_REINDEX_API_KEY || "";

const getJson = async (url) => {
  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
};

const postJson = async (url, headers, json) => {
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(json),
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
};

const mongoReadyFromBody = (body) => {
  const data = body && body.data !== undefined ? body.data : body;
  if (!data || typeof data !== "object") {
    return false;
  }
  return data.mongo === "connected" || data.ready === true;
};

async function main() {
  const lines = [];

  const record = (name, pass, detail) => {
    const tag = pass === true ? "PASS" : pass === false ? "FAIL" : "SKIP";
    lines.push({ tag, name, detail });
  };

  let r = await getJson(`${GATEWAY}/health`);
  record("Gateway /health", r.ok && r.body.success === true, `HTTP ${r.status}`);

  r = await getJson(`${GATEWAY}/ready`);
  record(
    "Gateway /ready",
    r.ok && r.body.success === true && r.body.data && r.body.data.ready === true,
    `HTTP ${r.status}`
  );

  const readyPaths = [
    ["/api/auth/ready", "identity"],
    ["/api/catalog/ready", "catalog"],
    ["/api/checkout/ready", "checkout"],
    ["/api/reporting/ready", "reporting"],
    ["/api/support/ready", "support"],
    ["/api/assistant/ready", "assistant"],
  ];

  for (const [path, label] of readyPaths) {
    r = await getJson(`${GATEWAY}${path}`);
    const ok = r.ok && mongoReadyFromBody(r.body);
    record(`Mongo readiness (${label})`, ok, `HTTP ${r.status} ${path}`);
  }

  r = await getJson(`${GATEWAY}/api/assistant/suggestions`);
  record(
    "Assistant suggestions",
    r.ok && r.body.success !== false,
    `HTTP ${r.status}`
  );

  if (REINDEX_KEY) {
    r = await postJson(
      `${GATEWAY}/api/assistant/reindex`,
      {
        Authorization: `Bearer ${REINDEX_KEY}`,
        "Content-Type": "application/json",
      },
      {}
    );
    record(
      "Assistant reindex",
      r.ok && r.body.success === true,
      `HTTP ${r.status} catalogUpserted=${r.body.data ? r.body.data.catalogUpserted : "?"}`
    );
  } else {
    record(
      "Assistant reindex",
      null,
      "skipped (set ASSISTANT_REINDEX_API_KEY to enable)"
    );
  }

  console.log("\n=== Demo stack check (gateway) ===\n");
  for (const row of lines) {
    console.log(`[${row.tag}] ${row.name}: ${row.detail}`);
  }

  const failed = lines.filter((x) => x.tag === "FAIL");
  if (failed.length) {
    console.log(`\nFailed: ${failed.length} step(s).\n`);
    process.exit(1);
  }

  console.log("\nAll required checks passed (skipped steps are informational).\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
