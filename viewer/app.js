const CDN = "https://esm.sh/genlayer-js@1.1.8";
const CHAINS = "https://esm.sh/genlayer-js@1.1.8/chains";

export const CONTRACT = "0x7Ee18844C80395E23f06Cf75D2B998723E36804f";
export const EXPLORER = "https://explorer-studio.genlayer.com";
export const REFRESH_MS = 15000;

const VERDICT_CLASS = {
  CONFIRMED_MISBEHAVIOR: "confirmed",
  FALSE_REPORT: "false-report",
  INSUFFICIENT_EVIDENCE: "insufficient",
};

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]
  ));
}

function short(address) {
  const text = String(address ?? "");
  return text.length > 14 ? text.slice(0, 8) + "…" + text.slice(-6) : text;
}

function safeUrl(value) {
  try {
    const url = new URL(String(value));
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

export async function readAll(client, contract = CONTRACT) {
  const stats = await client.readContract({ address: contract, functionName: "stats" });
  const ids = await client.readContract({ address: contract, functionName: "list_cases" });
  const cases = [];
  for (const id of ids.slice(-10).reverse()) {
    cases.push(await client.readContract({ address: contract, functionName: "get_case", args: [id] }));
  }
  return { stats, cases };
}

export function render(stats, cases, now = Date.now()) {
  const cutActive = Boolean(stats.cut_active);
  const deadline = stats.cut_until ? Date.parse(stats.cut_until) : NaN;
  const msLeft = Number.isFinite(deadline) ? deadline - now : 0;

  const pill = document.getElementById("state-pill");
  pill.textContent = cutActive ? "CUT ACTIVE" : "OPERATING";
  pill.className = "pill " + (cutActive ? "cut" : "open");

  document.getElementById("countdown").textContent = cutActive && msLeft > 0
    ? formatDuration(msLeft)
    : "";

  let meta;
  if (cutActive) {
    meta = `case ${stats.cut_case_id} - armed until ${stats.cut_until}`;
  } else if (stats.cut_until) {
    meta = `last window ended ${stats.cut_until} - allowance restored by the clock, no transaction`;
  } else {
    meta = "no cut has ever been armed";
  }
  document.getElementById("cut-meta").textContent = meta;

  const facts = [
    ["agent (its allowance gets cut)", stats.agent],
    ["owner (funds it, cannot suppress a case)", stats.owner],
    ["deposited", `${stats.deposited} GEN`],
    ["drawn", `${stats.drawn} GEN`],
    ["allowance remaining", `${stats.allowance_remaining} GEN`],
    ["underlying allowance", `${stats.underlying_allowance} GEN`],
    ["default cut window", `${stats.default_cut_seconds}s (max ${stats.max_cut_seconds}s)`],
    ["cuts armed / cases filed", `${stats.cuts} / ${stats.cases}`],
  ];
  document.getElementById("facts").innerHTML = facts.map(([label, value]) => `
    <div class="card">
      <div class="label">${esc(label)}</div>
      <div class="value">${esc(value)}</div>
    </div>`).join("");

  const container = document.getElementById("cases");
  if (!cases.length) {
    container.innerHTML = '<div class="empty">no cases on record yet</div>';
    return;
  }

  container.innerHTML = cases.map((entry) => {
    const verdictClass = VERDICT_CLASS[entry.verdict] ?? "false-report";
    const journal = safeUrl(entry.journal_url);
    const journalLine = journal
      ? `journal <a href="${esc(journal)}" target="_blank" rel="noopener">${esc(entry.journal_url)}</a>`
      : `journal ${esc(entry.journal_url)}`;

    let cutLine = "no cut armed by this case";
    if (entry.cut) {
      const expired = Number.isFinite(Date.parse(entry.expires_at)) && Date.parse(entry.expires_at) <= now;
      const ended = entry.lifted_at
        ? `reaped at ${entry.lifted_at}`
        : expired ? "lifted by the clock, no transaction" : "window still open";
      cutLine = `cut armed ${entry.armed_at} - expires ${entry.expires_at} (${ended})`;
    }

    return `
      <div class="case ${verdictClass}">
        <div class="top">
          <span class="id">${esc(entry.case_id)}</span>
          <span class="badge ${verdictClass}">${esc(entry.verdict)}</span>
        </div>
        <div class="claim">${esc(entry.claim)}</div>
        <div class="row">reporter ${esc(entry.reporter)} - filed ${esc(entry.submitted_at)}</div>
        <div class="row">${journalLine}</div>
        <div class="row">${esc(cutLine)}</div>
        <details>
          <summary>rationale and digest</summary>
          <div class="row">${esc(entry.rationale)}</div>
          <div class="sig">${esc(entry.digest?.signature)}</div>
          <div class="row">finalized ${esc(entry.finalized)} - validator round completed ${esc(entry.validator_agreed)}</div>
        </details>
      </div>`;
  }).join("");
}

function formatDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = String(Math.floor(total / 60)).padStart(2, "0");
  const seconds = String(total % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function showError(message) {
  const banner = document.getElementById("error");
  banner.textContent = message;
  banner.hidden = false;
}

function clearError() {
  document.getElementById("error").hidden = true;
}

async function boot() {
  document.getElementById("contract-link").href = EXPLORER;
  document.getElementById("contract-link").textContent = short(CONTRACT);

  let createClient;
  let studionet;
  try {
    ({ createClient } = await import(CDN));
    ({ studionet } = await import(CHAINS));
  } catch (error) {
    showError(`could not load the GenLayer SDK from the CDN: ${error.message ?? error}`);
    return;
  }

  let client;
  try {
    client = createClient({ chain: studionet });
  } catch (error) {
    showError(`could not create the read client: ${error.message ?? error}`);
    return;
  }

  let latest = null;
  const refresh = async () => {
    try {
      latest = await readAll(client);
      clearError();
      render(latest.stats, latest.cases);
      document.getElementById("updated").textContent = new Date().toISOString();
    } catch (error) {
      showError(`read failed: ${error.message ?? error} - retrying in ${REFRESH_MS / 1000}s`);
    }
  };

  await refresh();
  setInterval(refresh, REFRESH_MS);
  setInterval(() => {
    if (latest) render(latest.stats, latest.cases);
  }, 1000);
}

if (typeof document !== "undefined") {
  boot();
}
