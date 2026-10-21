import { EXPLORER } from "./contract";

export const OWNER = "0x158e5ccAA39F7Db714B35Ae5fb6A5d925BE219cD";
export const AGENT = "0x5a643A69876a37a749E5F897EC908712b4244221";
export const DEPLOY_TX =
  "0x2071117864281aa6c66906ecc90f914d69917b9590c1149653ca54e14f5cb905";
export const DEPLOYED_AT = "2026-10-20T19:50:06Z";
export const TEST_COUNT = 87;

export type EvidenceTx = {
  label: string;
  description: string;
  hash: string;
  result: string;
};

export const TRANSACTIONS: EvidenceTx[] = [
  {
    label: "Deploy",
    description: "Intelligent Contract deployed with the default 900s window.",
    hash: DEPLOY_TX,
    result: "FINALIZED",
  },
  {
    label: "Case live-runaway",
    description: "First live adjudication; cut armed for 900 seconds.",
    hash: "0x2e466d7a8e0d17380a7ba29ffdfb12a6ff2fec90df5ecd1c6bff2eef5f760014",
    result: "FINALIZED - CONFIRMED_MISBEHAVIOR",
  },
  {
    label: "Case cli-check-1",
    description: "Second live adjudication; cut armed for 900 seconds.",
    hash: "0x7dda175bfadf3226fbf6de9c9326fb339e19f51aa256a756cfae77f2a2a0887b",
    result: "FINALIZED - CONFIRMED_MISBEHAVIOR",
  },
  {
    label: "Window set to 180s",
    description: "Owner policy change used to capture both cut states quickly.",
    hash: "0x8d44618c1242dcb06a4133c575d6248fddaf59a372fdd70841a1f812bc583f55",
    result: "FINALIZED - owner policy change",
  },
  {
    label: "Case ui-check-1",
    description: "Third live adjudication; 180s demo window.",
    hash: "0x28f69b61edd599ade8ecacae61dcdfb92b005a542ea8e36f154f2eb58c259379",
    result: "FINALIZED - CONFIRMED_MISBEHAVIOR",
  },
  {
    label: "Window restored to 900s",
    description: "Owner policy change restoring the default window.",
    hash: "0xa4eeaba8c17399ffdfa0ef274fdf455a5ae0e59c505930162d8f945cc2ca8c88",
    result: "FINALIZED - owner policy change",
  },
  {
    label: "Browser SDK write validated",
    description: "genlayer-js 1.2.0 exercised the same write path this site uses; re-set the window to 900s.",
    hash: "0xc34b234a323707caae9c06d2e8fbd3b2e81ba807ea7cac4f1cbe0cd1e5851f8d",
    result: "FINALIZED - owner policy change",
  },
];

export type EvidenceCut = {
  caseId: string;
  armed: string;
  deadline: string;
  lifted: string;
  unlockTxs: number;
};

export const CUTS: EvidenceCut[] = [
  {
    caseId: "live-runaway",
    armed: "18:18:59Z",
    deadline: "18:33:59Z",
    lifted: "by the clock at 18:34:07Z",
    unlockTxs: 0,
  },
  {
    caseId: "cli-check-1",
    armed: "21:39:21Z",
    deadline: "21:54:21Z",
    lifted: "by the clock at 21:54:21Z",
    unlockTxs: 0,
  },
  {
    caseId: "ui-check-1",
    armed: "23:18:01Z",
    deadline: "23:21:01Z",
    lifted: "by the clock at 23:21:01Z",
    unlockTxs: 0,
  },
];

export function txUrl(hash: string): string {
  return `${EXPLORER}/tx/${hash}`;
}
