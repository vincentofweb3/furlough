"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { TransactionStatus } from "genlayer-js/types";
import { CONTRACT, EXPLORER, formatGen, shortAddress } from "@/lib/contract";
import { useStats } from "@/lib/useStats";
import { ensureStudionet, errorMessage, walletClient } from "@/lib/wallet";
import { useWallet } from "./WalletProvider";

type Busy = "window" | "agent" | "reap" | null;

export default function OwnerPanel() {
  const { stats, error: readError } = useStats();
  const { address, connect, ensureChain, error: walletError } = useWallet();
  const [windowValue, setWindowValue] = useState("");
  const [agentValue, setAgentValue] = useState("");
  const [reapValue, setReapValue] = useState("");
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const isOwner = Boolean(
    stats?.owner && address && stats.owner.toLowerCase() === address.toLowerCase(),
  );

  const run = async (label: Busy, action: (client: ReturnType<typeof walletClient>) => Promise<unknown>) => {
    setError(null);
    setNotice(null);
    setTxHash(null);
    let signer = address;
    if (!signer) {
      const result = await connect();
      if ("error" in result) {
        setError(result.error);
        return;
      }
      signer = result.address;
    }
    setBusy(label);
    try {
      const provider = await ensureChain();
      const client = walletClient(signer, provider);
      const tx = await action(client);
      const hash = String(tx);
      setTxHash(hash);
      await client.waitForTransactionReceipt({
        hash: hash as `0x${string}` & { length: 66 },
        status: TransactionStatus.FINALIZED,
        interval: 3000,
        retries: 160,
      });
      setNotice("Finalized. The board refreshes within 15 seconds.");
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  const setWindow = (event: FormEvent) => {
    event.preventDefault();
    const seconds = Number(windowValue);
    if (!Number.isInteger(seconds) || seconds < 1 || seconds > 3600) {
      setError("The window must be a whole number of seconds between 1 and 3600.");
      return;
    }
    void run("window", (client) =>
      client.writeContract({
        address: CONTRACT,
        functionName: "set_default_cut_seconds",
        args: [seconds],
        value: 0n,
        consensusMaxRotations: 5,
      }),
    );
  };

  const setAgent = (event: FormEvent) => {
    event.preventDefault();
    const value = agentValue.trim();
    if (!/^0x[0-9a-fA-F]{40}$/.test(value)) {
      setError("That is not a 20-byte hex address.");
      return;
    }
    void run("agent", (client) =>
      client.writeContract({
        address: CONTRACT,
        functionName: "set_agent",
        args: [value],
        value: 0n,
        consensusMaxRotations: 5,
      }),
    );
  };

  const reap = (event: FormEvent) => {
    event.preventDefault();
    const value = reapValue.trim();
    if (!value) {
      setError("Enter the case id whose expired window should be recorded.");
      return;
    }
    void run("reap", (client) =>
      client.writeContract({
        address: CONTRACT,
        functionName: "reap_expired",
        args: [value],
        value: 0n,
        consensusMaxRotations: 5,
      }),
    );
  };

  if (!stats) {
    return (
      <div className="card">
        <div className="label">Owner console</div>
        <p className="small">
          {readError ? `read failed: ${readError}` : "reading the contract..."}
        </p>
      </div>
    );
  }

  if (!address) {
    return (
      <div className="card">
        <div className="label">Owner console</div>
        <h2 className="form-title">Connect the owner wallet.</h2>
        <p className="small">
          This deployment&apos;s owner is <code>{stats.owner}</code>. Connect that wallet to change
          policy. Any other wallet can still file a case, but cannot change the agent or the window.
        </p>
        {walletError ? (
          <div className="error" role="alert">
            {walletError}
          </div>
        ) : null}
        <div className="cta-row">
          <button className="btn btn-primary" type="button" onClick={() => void connect()}>
            Connect wallet
          </button>
          <Link className="btn btn-ghost" href="/report">
            File a case instead
          </Link>
        </div>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="card">
        <div className="label">Owner console</div>
        <h2 className="form-title">This wallet is not the owner.</h2>
        <p className="small">
          Connected as <code>{address}</code>. The contract owner is <code>{stats.owner}</code>.
          Only the owner can change the agent or the default window. Filing a case is permissionless,
          so you do not need this console for that.
        </p>
        <div className="cta-row">
          <Link className="btn btn-primary" href="/report">
            File a case
          </Link>
          <Link className="btn btn-ghost" href="/live">
            Live board
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="grid three mt-18">
        <div className="card">
          <div className="label">Custody</div>
          <div className="value">{formatGen(stats.deposited)} deposited</div>
          <div className="small">{formatGen(stats.drawn)} drawn</div>
        </div>
        <div className="card">
          <div className="label">Allowance right now</div>
          <div className="value">{formatGen(stats.allowance_remaining)}</div>
          <div className="small">{stats.cut_active ? "cut in force" : "no cut in force"}</div>
        </div>
        <div className="card">
          <div className="label">Owner</div>
          <div className="value">
            <code>{shortAddress(stats.owner)}</code>
          </div>
          <div className="small">connected and verified against contract storage</div>
        </div>
      </div>

      {error ? (
        <div className="error" role="alert">
          {error}
        </div>
      ) : null}
      {notice ? <div className="notice">{notice}</div> : null}
      {txHash ? (
        <p className="small">
          Transaction{" "}
          <a href={`${EXPLORER}/tx/${txHash}`} target="_blank" rel="noopener noreferrer">
            <code>{shortAddress(txHash)}</code>
          </a>
        </p>
      ) : null}

      <div className="grid two mt-18">
        <form className="card form" onSubmit={setWindow}>
          <div className="label">Policy</div>
          <h3>Default cut window</h3>
          <p className="small">
            Current: <strong>{stats.default_cut_seconds}s</strong>. Clamped to 1..3600 by the
            contract. This affects future cases only; it cannot shorten an armed window.
          </p>
          <div className="field">
            <label htmlFor="window">Seconds</label>
            <input
              id="window"
              name="window"
              type="number"
              min={1}
              max={3600}
              step={1}
              value={windowValue}
              onChange={(event) => setWindowValue(event.target.value)}
              placeholder={String(stats.default_cut_seconds)}
              disabled={Boolean(busy)}
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={Boolean(busy)}>
            {busy === "window" ? "Confirm in wallet…" : "Set window"}
          </button>
        </form>

        <form className="card form" onSubmit={setAgent}>
          <div className="label">Policy</div>
          <h3>Bound agent</h3>
          <p className="small">
            Current: <code>{shortAddress(stats.agent)}</code>. Changing the agent does not clear an
            armed cut; the window keeps running against the new address.
          </p>
          <div className="field">
            <label htmlFor="agent">Agent address</label>
            <input
              id="agent"
              name="agent"
              value={agentValue}
              onChange={(event) => setAgentValue(event.target.value)}
              placeholder="0x..."
              spellCheck={false}
              autoComplete="off"
              disabled={Boolean(busy)}
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={Boolean(busy)}>
            {busy === "agent" ? "Confirm in wallet…" : "Set agent"}
          </button>
        </form>

        <form className="card form" onSubmit={reap}>
          <div className="label">Record-keeping</div>
          <h3>Record an expired window</h3>
          <p className="small">
            <code>reap_expired</code> writes <code>lifted_at</code> once a deadline has passed. It is
            cosmetic and permissionless: the allowance already returned, and no one can clear a live
            window.
          </p>
          <div className="field">
            <label htmlFor="reap">Case id</label>
            <input
              id="reap"
              name="reap"
              value={reapValue}
              onChange={(event) => setReapValue(event.target.value)}
              placeholder="ui-check-1"
              spellCheck={false}
              autoComplete="off"
              disabled={Boolean(busy)}
            />
          </div>
          <button className="btn btn-ghost" type="submit" disabled={Boolean(busy)}>
            {busy === "reap" ? "Confirm in wallet…" : "Record expiry"}
          </button>
        </form>

        <div className="card">
          <div className="label">Not here</div>
          <h3>No way to lift a cut.</h3>
          <p className="small">
            There is no method that shortens or clears an armed window, and this console does not
            pretend otherwise. Deposit and draw exist in the contract, but the live deployment has{" "}
            <code>deposited = 0</code>; the value loop is covered by hermetic tests, not a funded
            demo.
          </p>
          <p className="small">
            Studionet charges no fees, so these writes need no GEN for gas.
          </p>
        </div>
      </div>
    </div>
  );
}
