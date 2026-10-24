import { EXPLORER } from "./contract";

export const OWNER = "0x158e5ccAA39F7Db714B35Ae5fb6A5d925BE219cD";
export const AGENT = "0x7adE3852187F6FDAC7798c826620F49a9D529964";
export const OBSERVER = "0x69780b792B74376D22232668EDCa18008195cD3A";
export const DEPLOY_TX =
  "0x9156b52a3794d7d133307f6aa9225aa0b4a6cae4d3cdd73b67ae8c191addad17";
export const DEPLOYED_AT = "2026-10-23";
export const TEST_COUNT = 122;

export type EvidenceTx = {
  label: string;
  description: string;
  hash: string;
  result: string;
};

export const TRANSACTIONS: EvidenceTx[] = [
  {
    label: "Deploy",
    description:
      "v3 contract deployed with a separately bound observer and recoverable settlement.",
    hash: DEPLOY_TX,
    result: "FINALIZED",
  },
  {
    label: "Case live-v3-auth-1",
    description: "Observer-signed runaway envelope; cut armed for 900 seconds.",
    hash: "0x1b1ee7baf91def4cfdd6f6cabc63f05dba32242e73ef12e59d7bade8a50916df",
    result: "FINALIZED - CONFIRMED_MISBEHAVIOR",
  },
  {
    label: "Case live-v3-unsigned-1",
    description: "Same journal bytes without a signature; rejected before any model call.",
    hash: "0xd9f6f7c6353b21b2e6fcd4c634ca39d30edea649e17942f8f4030634aab8d27f",
    result: "FINALIZED - INSUFFICIENT_EVIDENCE",
  },
  {
    label: "Case live-v3-benign-1",
    description: "Observer-signed ordinary-work envelope; no cut.",
    hash: "0xc591d813602c7d9c524f2d6854e05f258418ab43b34c15041fb8581250ede04a",
    result: "FINALIZED - FALSE_REPORT",
  },
  {
    label: "Case live-v3-foreign-1",
    description: "Observer-signed, but the journal names another agent; agent_matches is false.",
    hash: "0xdf4b907b87260262aa2e718464e62afe527a3d14104f552f6b1bb3c3f1b4c4e7",
    result: "FINALIZED - INSUFFICIENT_EVIDENCE",
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
    caseId: "live-v3-auth-1",
    armed: "09:01:53Z",
    deadline: "09:16:53Z",
    lifted: "by the clock at 09:16:53Z",
    unlockTxs: 0,
  },
];

export function txUrl(hash: string): string {
  return `${EXPLORER}/tx/${hash}`;
}
