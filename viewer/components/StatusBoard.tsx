"use client";

import { formatDuration, formatGen } from "@/lib/contract";
import type { Stats } from "@/lib/contract";
import { useSnapshot } from "@/lib/useSnapshot";
import CaseCard from "./CaseCard";

function facts(stats: Stats): Array<[string, string]> {
  return [
    ["agent (its allowance gets cut)", stats.agent],
    ["owner (funds it, cannot suppress a case)", stats.owner],
    ["deposited", formatGen(stats.deposited)],
    ["drawn", formatGen(stats.drawn)],
    ["allowance remaining", formatGen(stats.allowance_remaining)],
    ["underlying allowance", formatGen(stats.underlying_allowance)],
    ["default cut window", `${stats.default_cut_seconds}s (max ${stats.max_cut_seconds}s)`],
    ["cuts armed / cases filed", `${stats.cuts} / ${stats.cases}`],
  ];
}

export default function StatusBoard() {
  const { snapshot, error, updated, now } = useSnapshot();
  const stats = snapshot?.stats;
  const cases = snapshot?.cases ?? [];
  const cutActive = Boolean(stats?.cut_active);
  const deadline = stats?.cut_until ? Date.parse(stats.cut_until) : Number.NaN;
  const msLeft = Number.isFinite(deadline) ? deadline - now : 0;

  let meta = "reading the contract...";
  if (stats) {
    if (cutActive) {
      meta = `case ${stats.cut_case_id} - armed until ${stats.cut_until}`;
    } else if (stats.cut_until) {
      meta = `last window ended ${stats.cut_until} - allowance restored by the clock, no transaction`;
    } else if (stats.cuts > 0) {
      meta = "no window open - every cut lifted by the clock, no transaction";
    } else {
      meta = "no cut has ever been armed";
    }
  }

  return (
    <div>
      {error ? (
        <div className="error" role="alert">
          read failed: {error} - retrying every 15s
        </div>
      ) : null}

      <div className="breaker">
        <div className={`pill ${!stats ? "" : cutActive ? "cut" : "open"}`}>
          {!stats ? "connecting" : cutActive ? "CUT ACTIVE" : "OPERATING"}
        </div>
        <div>
          <div className="countdown">
            {cutActive && msLeft > 0 ? formatDuration(msLeft) : ""}
          </div>
          <div className="muted">{meta}</div>
        </div>
      </div>

      <h2 className="mt-42">Custody and control</h2>
      <div className="grid">
        {stats
          ? facts(stats).map(([label, value]) => (
              <div className="card" key={label}>
                <div className="label">{label}</div>
                <div className="value">{value}</div>
              </div>
            ))
          : Array.from({ length: 8 }).map((_, index) => (
              <div className="card skeleton" key={index}>
                <div className="label">reading</div>
                <div className="value">-</div>
              </div>
            ))}
      </div>

      <h2 className="mt-42">Case record</h2>
      {!snapshot && !error ? <div className="empty">reading...</div> : null}
      {snapshot && cases.length === 0 ? <div className="empty">no cases on record yet</div> : null}
      {cases.map((entry) => (
        <CaseCard key={entry.case_id} entry={entry} now={now} />
      ))}

      <p className="muted mt-28">
        A cut is enforced by the contract itself: while the window is open, <code>draw()</code> is
        refused before any state changes. When the window passes, the allowance restores itself with
        no transaction and no human. Last refreshed {updated ?? "-"}.
      </p>
    </div>
  );
}
