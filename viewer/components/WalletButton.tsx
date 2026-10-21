"use client";

import { useEffect, useRef, useState } from "react";
import { shortAddress, STUDIONET_CHAIN_ID } from "@/lib/contract";
import { errorMessage } from "@/lib/wallet";
import { useWallet } from "./WalletProvider";

export default function WalletButton() {
  const { address, chainId, connecting, error, hasProvider, connect, disconnect, ensureChain } =
    useWallet();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  if (!hasProvider) {
    return (
      <a
        className="wallet-btn"
        href="https://metamask.io/download/"
        target="_blank"
        rel="noopener noreferrer"
        title="MetaMask is required to sign writes. Reads never need a wallet."
      >
        Get MetaMask
      </a>
    );
  }

  if (!address) {
    return (
      <button className="wallet-btn" type="button" onClick={connect} disabled={connecting}>
        {connecting ? "Connecting…" : "Connect wallet"}
      </button>
    );
  }

  const wrongChain = chainId !== STUDIONET_CHAIN_ID;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  const switchChain = async () => {
    setSwitching(true);
    setLocalError(null);
    try {
      await ensureChain();
    } catch (error) {
      setLocalError(errorMessage(error));
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="wallet-wrap" ref={wrapRef}>
      <button
        className={`wallet-btn${wrongChain ? " warn" : ""}`}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className={`wallet-dot${wrongChain ? " warn" : ""}`} aria-hidden="true" />
        {shortAddress(address)}
      </button>
      {open ? (
        <div className="wallet-menu">
          <div className="wallet-row">
            <span className="wallet-label">Account</span>
            <code>{shortAddress(address)}</code>
          </div>
          <div className="wallet-row">
            <span className="wallet-label">Network</span>
            <span className={wrongChain ? "wallet-warn" : "wallet-ok"}>
              {wrongChain ? "not Studionet" : "Studionet 61999"}
            </span>
          </div>
          {wrongChain ? (
            <button className="btn btn-primary wallet-menu-btn" type="button" onClick={switchChain} disabled={switching}>
              {switching ? "Switching…" : "Switch to Studionet"}
            </button>
          ) : null}
          {localError ?? error ? <p className="wallet-error">{localError ?? error}</p> : null}
          <div className="wallet-actions">
            <button className="btn btn-ghost wallet-menu-btn" type="button" onClick={copy}>
              {copied ? "Copied" : "Copy address"}
            </button>
            <button
              className="btn btn-ghost wallet-menu-btn"
              type="button"
              onClick={() => {
                disconnect();
                setOpen(false);
              }}
            >
              Disconnect
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
