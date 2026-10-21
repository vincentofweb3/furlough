"use client";

import { useEffect, useState } from "react";
import { readClient, readStats, REFRESH_MS, type Stats } from "./contract";

export function useStats(interval = REFRESH_MS) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        const next = await readStats(client);
        if (!alive) return;
        setStats(next);
        setError(null);
      } catch (error) {
        if (!alive) return;
        setError(error instanceof Error ? error.message : String(error));
      }
    };

    void refresh();
    const poll = setInterval(refresh, interval);
    return () => {
      alive = false;
      clearInterval(poll);
    };
  }, [interval]);

  return { stats, error };
}
