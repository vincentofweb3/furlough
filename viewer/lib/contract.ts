import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

export const CONTRACT = "0x84795e25Ae0BF5337829b614493D054c1c15c907";
export const EXPLORER = "https://explorer-studio.genlayer.com";
export const REFRESH_MS = 15000;
export const STUDIONET_CHAIN_ID = 61999;
export const STUDIONET_CHAIN_HEX = "0xf22f";

export type Stats = {
  agent: string;
  owner: string;
  deposited: number;
  drawn: number;
  recovered: number;
  allowance_remaining: number;
  underlying_allowance: number;
  default_cut_seconds: number;
  max_cut_seconds: number;
  cuts: number;
  cases: number;
  cut_active: boolean;
  cut_case_id: string;
  cut_until: string;
};

export type CaseRecord = {
  case_id: string;
  reporter: string;
  claim: string;
  journal_url: string;
  submitted_at: string;
  verdict: string;
  rationale: string;
  digest?: {
    signature?: string;
    journal_found?: boolean;
    authenticated?: boolean;
    agent_matches?: boolean;
    note?: string;
  } & Record<string, unknown>;
  cut: boolean;
  armed_at?: string;
  expires_at?: string;
  lifted_at?: string;
  finalized?: string;
  validator_agreed?: boolean;
};

export type Snapshot = { stats: Stats; cases: CaseRecord[] };

export const VERDICT_CLASS: Record<string, string> = {
  CONFIRMED_MISBEHAVIOR: "confirmed",
  FALSE_REPORT: "false-report",
  INSUFFICIENT_EVIDENCE: "insufficient",
};

let readClientInstance: ReturnType<typeof createClient> | null = null;

export function readClient() {
  if (!readClientInstance) {
    readClientInstance = createClient({ chain: studionet });
  }
  return readClientInstance;
}

export async function readStats(client = readClient()): Promise<Stats> {
  return (await client.readContract({
    address: CONTRACT,
    functionName: "stats",
  })) as Stats;
}

export async function readAll(client = readClient()): Promise<Snapshot> {
  const [stats, ids] = await Promise.all([
    readStats(client),
    client.readContract({
      address: CONTRACT,
      functionName: "list_cases",
    }) as Promise<string[]>,
  ]);
  const cases = await Promise.all(
    (ids ?? []).slice(-10).reverse().map(
      (id) =>
        client.readContract({
          address: CONTRACT,
          functionName: "get_case",
          args: [id],
        }) as Promise<CaseRecord>,
    ),
  );
  return { stats, cases };
}

export function shortAddress(value: string | null | undefined): string {
  const text = String(value ?? "");
  return text.length > 14 ? `${text.slice(0, 8)}…${text.slice(-6)}` : text;
}

export function safeHttpUrl(value: string | null | undefined): string {
  try {
    const url = new URL(String(value));
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = String(Math.floor(total / 60)).padStart(2, "0");
  const seconds = String(total % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function formatGen(value: number | string | null | undefined): string {
  const number = Number(value ?? 0);
  return `${Number.isFinite(number) ? number.toLocaleString("en-US") : "0"} GEN`;
}
