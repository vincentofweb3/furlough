import { EXPLORER } from "./contract";

export const OWNER = "0x158e5ccAA39F7Db714B35Ae5fb6A5d925BE219cD";
export const AGENT = "0x7adE3852187F6FDAC7798c826620F49a9D529964";
export const DEPLOY_TX =
  "0x04d2cfa2dc7c7dc66b0c6d4946b9081b5fc7dd6ce938de4b17a8e934ef53e2f1";
export const DEPLOYED_AT = "2026-10-23T00:34:45Z";
export const TEST_COUNT = 106;

export type EvidenceTx = {
  label: string;
  description: string;
  hash: string;
  result: string;
};

export const TRANSACTIONS: EvidenceTx[] = [
  {
    label: "Deploy",
    description: "v2 contract deployed with signed-agent evidence and recoverable settlement.",
    hash: DEPLOY_TX,
    result: "FINALIZED",
  },
  {
    label: "Case live-v2-auth-1",
    description: "Signed runaway envelope; cut armed for 900 seconds.",
    hash: "0xe476c03040aaf16f8c4c68939a7ed60bd2990cfcda77e10fb89efa64fc69f5d3",
    result: "FINALIZED - CONFIRMED_MISBEHAVIOR",
  },
  {
    label: "Case live-v2-unsigned-1",
    description: "Same journal bytes without a signature; rejected before any model call.",
    hash: "0xfcac4e30bd25c080c93c6ff90f0e7c054124821c6506055ae8949d864f7f8151",
    result: "FINALIZED - INSUFFICIENT_EVIDENCE",
  },
  {
    label: "Case live-v2-benign-1",
    description: "Signed ordinary-work envelope; no cut.",
    hash: "0xb6090a9fb5826496f202617da6be019db0ee210e1bbed9231b67c89474414ca8",
    result: "FINALIZED - FALSE_REPORT",
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
    caseId: "live-v2-auth-1",
    armed: "00:54:12Z",
    deadline: "01:09:12Z",
    lifted: "by the clock at 01:09:12Z",
    unlockTxs: 0,
  },
];

export function txUrl(hash: string): string {
  return `${EXPLORER}/tx/${hash}`;
}
