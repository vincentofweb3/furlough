"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { TransactionStatus } from "genlayer-js/types";
import {
  CONTRACT,
  EXPLORER,
  readClient,
  shortAddress,
  type CaseRecord,
  VERDICT_CLASS,
} from "@/lib/contract";
import { ensureStudionet, errorMessage, walletClient } from "@/lib/wallet";
import { useWallet } from "./WalletProvider";

type Phase = "idle" | "signing" | "waiting" | "done";

const VERDICT_TEXT: Record<string, string> = {
  CONFIRMED_MISBEHAVIOR:
    "The cut is now enforced by the contract. The allowance reads zero until expires_at, then restores itself with no transaction.",
  FALSE_REPORT: "The case is public, but the allowance is untouched.",
  INSUFFICIENT_EVIDENCE:
    "The journal could not be judged. The contract fails open and leaves the allowance untouched.",
};

function validUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export default function ReportForm() {
  const { address, connect, ensureChain, connecting } = useWallet();
  const [caseId, setCaseId] = useState("");
  const [claim, setClaim] = useState("");
  const [journalUrl, setJournalUrl] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [result, setResult] = useState<CaseRecord | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    setCaseId(`web-${Date.now().toString(36)}`);
  }, []);

  useEffect(() => {
    if (phase !== "waiting") return;
    setElapsed(0);
    const id = setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  const busy = phase === "signing" || phase === "waiting";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setResult(null);
    setTxHash(null);

    const id = caseId.trim();
    const statement = claim.trim();
    const journal = journalUrl.trim();

    if (id.length < 3 || id.length > 128) {
      setError("Case id must be between 3 and 128 characters.");
      return;
    }
    if (!statement) {
      setError("State what you are alleging. The claim is recorded verbatim (up to 2000 characters).");
      return;
    }
    if (statement.length > 2000) {
      setError("The claim is limited to 2000 characters.");
      return;
    }
    if (!validUrl(journal)) {
      setError("The journal must be a public http(s) URL that validators can fetch.");
      return;
    }
    if (journal.length > 2000) {
      setError("The journal URL is limited to 2000 characters.");
      return;
    }

    let signer = address;
    if (!signer) {
      const result = await connect();
      if ("error" in result) {
        setError(result.error);
        return;
      }
      signer = result.address;
    }

    try {
      setPhase("signing");
      const provider = await ensureChain();
      const client = walletClient(signer, provider);
      const tx = await client.writeContract({
        address: CONTRACT,
        functionName: "open_case",
        args: [JSON.stringify({ case_id: id, claim: statement, journal_url: journal })],
        value: 0n,
        consensusMaxRotations: 5,
      });
      const hash = String(tx);
      setTxHash(hash);
      setPhase("waiting");
      await client.waitForTransactionReceipt({
        hash: hash as `0x${string}` & { length: 66 },
        status: TransactionStatus.FINALIZED,
        interval: 3000,
        retries: 160,
      });
      const record = (await readClient().readContract({
        address: CONTRACT,
        functionName: "get_case",
        args: [id],
      })) as CaseRecord;
      setResult(record);
      setPhase("done");
    } catch (error) {
      setError(errorMessage(error));
      setPhase("idle");
    }
  };

  if (phase === "done" && result) {
    const verdictClass = VERDICT_CLASS[result.verdict] ?? "false-report";
    return (
      <div className="card receipt">
        <div className="label">Case finalized</div>
        <div className="top">
          <span className="id">{result.case_id}</span>
          <span className={`badge ${verdictClass}`}>{result.verdict}</span>
        </div>
        <p className="claim">{result.claim}</p>
        <p className="small">{VERDICT_TEXT[result.verdict] ?? "The verdict is recorded on chain."}</p>
        {result.cut ? (
          <p className="small">
            cut armed {result.armed_at} - expires {result.expires_at}. The deadline is fixed; no
            method on the contract can shorten it.
          </p>
        ) : null}
        <div className="kv">
          <span>reporter</span>
          <code>{result.reporter}</code>
        </div>
        <div className="kv">
          <span>transaction</span>
          {txHash ? (
            <a href={`${EXPLORER}/tx/${txHash}`} target="_blank" rel="noopener noreferrer">
              <code>{shortAddress(txHash)}</code>
            </a>
          ) : (
            <code>not available</code>
          )}
        </div>
        <div className="kv">
          <span>rationale</span>
          <span className="small">{result.rationale}</span>
        </div>
        <div className="cta-row mt-18">
          <Link className="btn btn-primary" href={`/live#case-${result.case_id}`}>
            See it on the live board
          </Link>
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => {
              setPhase("idle");
              setResult(null);
              setTxHash(null);
              setCaseId(`web-${Date.now().toString(36)}`);
              setClaim("");
              setJournalUrl("");
            }}
          >
            File another case
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="card form" onSubmit={submit}>
      <div className="label">Open a case</div>
      <h2 className="form-title">Put an allegation on chain.</h2>
      <p className="small">
        Anyone can file. There is no owner gate and no allowlist. Studionet charges no fee; the only
        requirement is a wallet to sign the filing.
      </p>

      <div className="field">
        <label htmlFor="case-id">Case id</label>
        <input
          id="case-id"
          name="case-id"
          value={caseId}
          onChange={(event) => setCaseId(event.target.value)}
          maxLength={128}
          spellCheck={false}
          autoComplete="off"
          disabled={busy}
        />
        <span className="hint">Unique and permanent. A repeat id reverts.</span>
      </div>

      <div className="field">
        <label htmlFor="claim">What are you alleging?</label>
        <textarea
          id="claim"
          name="claim"
          rows={4}
          value={claim}
          onChange={(event) => setClaim(event.target.value)}
          maxLength={2000}
          placeholder="Describe the suspected runaway behaviour in one or two sentences."
          disabled={busy}
        />
        <span className="hint">{claim.length}/2000 characters. Recorded verbatim.</span>
      </div>

      <div className="field">
        <label htmlFor="journal">Journal URL</label>
        <input
          id="journal"
          name="journal"
          type="url"
          inputMode="url"
          value={journalUrl}
          onChange={(event) => setJournalUrl(event.target.value)}
          placeholder="https://paste.rs/..."
          maxLength={2000}
          spellCheck={false}
          autoComplete="off"
          disabled={busy}
        />
        <span className="hint">
          A public journal the validators can fetch. The claim is not evidence; the journal is.
        </span>
      </div>

      {error ? (
        <div className="error" role="alert">
          {error}
        </div>
      ) : null}
      <div className="form-actions">
        <button className="btn btn-primary" type="submit" disabled={busy || connecting}>
          {phase === "signing"
            ? "Confirm in your wallet…"
            : phase === "waiting"
              ? "Consensus is running…"
              : address
                ? "File case and wait for consensus"
                : "Connect wallet to file"}
        </button>
        <span className="small">
          {address ? `signing as ${shortAddress(address)}` : "no wallet connected"}
        </span>
      </div>

      {phase === "waiting" ? (
        <div className="wait-panel">
          <div className="spinner" aria-hidden="true" />
          <div>
            <strong>Waiting for finality.</strong>{" "}
            <span className="small">
              {elapsed}s elapsed. Validators re-fetch the journal and compare one enum; a live round
              usually takes about a minute.
            </span>
          </div>
        </div>
      ) : null}

      {txHash ? (
        <p className="small">
          Transaction{" "}
          <a href={`${EXPLORER}/tx/${txHash}`} target="_blank" rel="noopener noreferrer">
            <code>{shortAddress(txHash)}</code>
          </a>
        </p>
      ) : null}
    </form>
  );
}
