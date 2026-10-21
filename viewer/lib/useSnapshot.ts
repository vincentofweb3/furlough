"use client";

import { useEffect, useState } from "react";
import { REFRESH_MS, readAll, readClient, type Snapshot } from "./contract";

export function useSnapshot(interval = REFRESH_MS) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updated, setUpdated] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let alive = true;
    let client: ReturnType<typeof readClient>;
    try {
      client = readClient();
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
      return;
    }

    const refresh = async () => {
      try {
        const next = await readAll(client);
        if (!alive) return;
        setSnapshot(next);
        setError(null);
        setUpdated(new Date().toISOString());
      } catch (error) {
        if (!alive) return;
        setError(error instanceof Error ? error.message : String(error));
      }
    };

    void refresh();
    const poll = setInterval(refresh, interval);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      alive = false;
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [interval]);

  return { snapshot, error, updated, now };
}
