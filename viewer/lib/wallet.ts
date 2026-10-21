import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { STUDIONET_CHAIN_HEX, STUDIONET_CHAIN_ID } from "./contract";

export type Eip1193Provider = {
  request(args: { method: string; params?: unknown }): Promise<unknown>;
  on?(event: string, handler: (...args: unknown[]) => void): void;
  removeListener?(event: string, handler: (...args: unknown[]) => void): void;
};

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

const STUDIONET_PARAMS = {
  chainId: STUDIONET_CHAIN_HEX,
  chainName: "GenLayer Studionet",
  rpcUrls: ["https://studio.genlayer.com/api"],
  nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
  blockExplorerUrls: ["https://explorer-studio.genlayer.com"],
};

export function getProvider(): Eip1193Provider | null {
  if (typeof window === "undefined") return null;
  return window.ethereum ?? null;
}

export function errorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const candidate = error as { message?: unknown; code?: unknown };
    if (typeof candidate.message === "string") return candidate.message;
    if (candidate.code === 4001) return "Request rejected in the wallet.";
  }
  return String(error);
}

export async function connectWallet(provider: Eip1193Provider) {
  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
  if (!accounts?.[0]) throw new Error("No account returned by the wallet.");
  const chainIdHex = (await provider.request({ method: "eth_chainId" })) as string;
  return { address: accounts[0], chainId: Number.parseInt(chainIdHex, 16) };
}

export async function ensureStudionet(provider: Eip1193Provider): Promise<void> {
  const current = (await provider.request({ method: "eth_chainId" })) as string;
  if (Number.parseInt(current, 16) === STUDIONET_CHAIN_ID) return;
  try {
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [STUDIONET_PARAMS],
    });
  } catch (error) {
    const code = (error as { code?: number } | null)?.code;
    if (code === 4001) throw error;
  }
  await provider.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId: STUDIONET_CHAIN_HEX }],
  });
}

export function walletClient(address: string, provider: Eip1193Provider) {
  return createClient({
    chain: studionet,
    account: address as `0x${string}`,
    provider,
  });
}
