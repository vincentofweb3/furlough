"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  connectWallet,
  ensureStudionet,
  errorMessage,
  getProvider,
  type Eip1193Provider,
} from "@/lib/wallet";

type WalletContextValue = {
  address: string | null;
  chainId: number | null;
  connecting: boolean;
  error: string | null;
  hasProvider: boolean;
  connect: () => Promise<{ address: string } | { error: string }>;
  disconnect: () => void;
  ensureChain: () => Promise<Eip1193Provider>;
  clearError: () => void;
};

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasProvider, setHasProvider] = useState(false);

  useEffect(() => {
    const provider = getProvider();
    setHasProvider(Boolean(provider));
    if (!provider) return;

    provider
      .request({ method: "eth_accounts" })
      .then(async (accounts) => {
        const list = accounts as string[];
        if (!list?.[0]) return;
        setAddress(list[0]);
        const id = (await provider.request({ method: "eth_chainId" })) as string;
        setChainId(Number.parseInt(id, 16));
      })
      .catch(() => undefined);

    const onAccounts = (...args: unknown[]) => {
      const accounts = args[0] as string[] | undefined;
      setAddress(accounts?.[0] ?? null);
    };
    const onChain = (...args: unknown[]) => {
      const id = args[0] as string | undefined;
      if (id) setChainId(Number.parseInt(id, 16));
    };
    provider.on?.("accountsChanged", onAccounts);
    provider.on?.("chainChanged", onChain);
    return () => {
      provider.removeListener?.("accountsChanged", onAccounts);
      provider.removeListener?.("chainChanged", onChain);
    };
  }, []);

  const connect = useCallback(async () => {
    const provider = getProvider();
    if (!provider) {
      const message = "MetaMask is not installed. Install it or use the CLI in the repository.";
      setError(message);
      return { error: message };
    }
    setConnecting(true);
    setError(null);
    try {
      const next = await connectWallet(provider);
      setAddress(next.address);
      setChainId(next.chainId);
      return { address: next.address };
    } catch (error) {
      const message = errorMessage(error);
      setError(message);
      return { error: message };
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setError(null);
  }, []);

  const ensureChain = useCallback(async () => {
    const provider = getProvider();
    if (!provider) throw new Error("MetaMask is not installed.");
    await ensureStudionet(provider);
    const id = (await provider.request({ method: "eth_chainId" })) as string;
    setChainId(Number.parseInt(id, 16));
    return provider;
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo(
    () => ({
      address,
      chainId,
      connecting,
      error,
      hasProvider,
      connect,
      disconnect,
      ensureChain,
      clearError,
    }),
    [address, chainId, connecting, error, hasProvider, connect, disconnect, ensureChain, clearError],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const value = useContext(WalletContext);
  if (!value) throw new Error("useWallet must be used inside WalletProvider");
  return value;
}
