"use client";

import { useStats } from "@/lib/useStats";

export default function LiveStrip() {
  const { stats, error } = useStats();
  const cut = Boolean(stats?.cut_active);
  const state = !stats
    ? error
      ? { label: "LIVE READ UNAVAILABLE", className: "" }
      : { label: "READING…", className: "" }
    : cut
      ? { label: "CUT ACTIVE", className: "cut" }
      : { label: "OPERATING", className: "open" };

  return (
    <div className="live-strip">
      <span
        className={`state ${state.className}`}
        title={error ?? (cut ? `until ${stats?.cut_until}` : "no cut window open")}
      >
        {state.label}
      </span>
      <div className="facts">
        <span className="fact">
          cases filed <b>{stats ? stats.cases : "-"}</b>
        </span>
        <span className="fact">
          cuts armed <b>{stats ? stats.cuts : "-"}</b>
        </span>
        <span className="fact">
          default window <b>{stats ? `${stats.default_cut_seconds}s` : "-"}</b>
        </span>
        <span className="fact">
          network <b>Studionet 61999</b>
        </span>
      </div>
    </div>
  );
}
