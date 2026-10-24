import type { Metadata } from "next";
import Link from "next/link";
import CopyButton from "@/components/CopyButton";
import { CONTRACT, shortAddress, STUDIONET_CHAIN_ID } from "@/lib/contract";
import {
  AGENT,
  CUTS,
  DEPLOYED_AT,
  TEST_COUNT,
  TRANSACTIONS,
  txUrl,
  OWNER,
  OBSERVER,
} from "@/lib/evidence";

export const metadata: Metadata = {
  title: "Verify - contract, transactions, tests",
  description:
    "Every claim about Furlough mapped to a public artifact: the deployed contract, finalized transactions, the live case record, and the hermetic test suite.",
};

function shortHash(hash: string) {
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
}

export default function VerifyPage() {
  return (
    <>
      <section className="hero compact">
        <div className="wrap">
          <span className="kicker">Evidence</span>
          <h1>Don&apos;t take this site&apos;s word for it.</h1>
          <p className="lede">
            Every claim about Furlough maps to an artifact you can open: a finalized transaction, a
            contract method, a test, or a limit stated openly. If something here cannot be checked,
            it should not be believed.
          </p>
          <div className="cta-row">
            <Link className="btn btn-ghost" href="/live">
              Live board
            </Link>
            <Link className="btn btn-ghost" href="/report">
              File a case
            </Link>
            <a
              className="btn btn-ghost"
              href="https://github.com/vincentofweb3/furlough/blob/master/docs/CONSENSUS.md"
              target="_blank"
              rel="noopener noreferrer"
            >
              Safety argument
            </a>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <h2>The deployment</h2>
          <div className="grid two">
            <div className="card">
              <div className="label">Intelligent Contract</div>
              <div className="addr">{CONTRACT}</div>
              <div className="cta-row mt-14">
                <CopyButton value={CONTRACT} />
                <a className="btn btn-ghost" href="https://explorer-studio.genlayer.com" target="_blank" rel="noopener noreferrer">
                  Open explorer
                </a>
              </div>
            </div>
            <div className="card">
              <div className="label">Network</div>
              <div className="value">GenLayer Studionet - chain {STUDIONET_CHAIN_ID}</div>
              <p className="small mb-0">
                Zero fees for writes; reads need no wallet. Deployed {DEPLOYED_AT}.
              </p>
            </div>
            <div className="card">
              <div className="label">Owner</div>
              <div className="addr">{OWNER}</div>
              <p className="small mb-0">
                Can change future policy. Cannot lift an armed cut.{" "}
                <Link href="/owner">Owner console</Link>.
              </p>
            </div>
            <div className="card">
              <div className="label">Bound agent</div>
              <div className="addr">{AGENT}</div>
              <p className="small mb-0">The address whose allowance the breaker cuts.</p>
            </div>
            <div className="card">
              <div className="label">Bound observer</div>
              <div className="addr">{OBSERVER}</div>
              <p className="small mb-0">
                The immutable witness whose key must sign the journal. It cannot spend and has no
                setter.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <h2>Finalized transactions</h2>
          <p className="section-sub">
            Five transactions exist for this deployment: the deploy and four case filings. Three
            cases carried observer signatures; the unsigned case deliberately did not. One signed
            case named a different agent and was rejected by <code>agent_matches</code>. Everything
            else is a read.
          </p>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Transaction</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {TRANSACTIONS.map((tx) => (
                  <tr key={tx.hash}>
                    <td>
                      <span className="mono-label">{tx.label}</span>
                      <span className="cell-sub">{tx.description}</span>
                    </td>
                    <td>
                      <a href={txUrl(tx.hash)} target="_blank" rel="noopener noreferrer">
                        <code>{shortHash(tx.hash)}</code>
                      </a>
                    </td>
                    <td>{tx.result}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="small mt-14">
            Full hashes are in{" "}
            <a
              href="https://github.com/vincentofweb3/furlough/blob/master/docs/DEPLOY.md"
              target="_blank"
              rel="noopener noreferrer"
            >
              docs/DEPLOY.md
            </a>
            . The case record on the <Link href="/live">live board</Link> is read from contract
            storage, not from this page.
          </p>
        </div>
      </section>

      <section>
        <div className="wrap">
          <h2>One signed cut, no unlock transaction</h2>
          <p className="section-sub">
            The product claim, as recorded on chain. &quot;Lifted&quot; means the deadline passed and
            the allowance returned by itself. The unsigned case filed alongside it was rejected
            before any model was consulted.
          </p>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Case</th>
                  <th>Armed</th>
                  <th>Deadline</th>
                  <th>Lifted</th>
                  <th>Unlock txs</th>
                </tr>
              </thead>
              <tbody>
                {CUTS.map((cut) => (
                  <tr key={cut.caseId}>
                    <td>{cut.caseId}</td>
                    <td>{cut.armed}</td>
                    <td>{cut.deadline}</td>
                    <td>{cut.lifted}</td>
                    <td>{cut.unlockTxs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="small mt-14">
            <code>live-v3-auth-1</code> was filed with a signed envelope;{" "}
            <code>live-v3-unsigned-1</code> served the same journal bytes without a signature and
            finalized as <code>INSUFFICIENT_EVIDENCE</code>.{" "}
            <code>live-v3-foreign-1</code> was signed by the observer but named another agent and
            was rejected before any model call. No method exists that lifts a cut early. The only
            write after a cut is <code>reap_expired</code>, which records <code>lifted_at</code> for
            the public log and changes no allowance.
          </p>
        </div>
      </section>

      <section>
        <div className="wrap">
          <h2>The console writes to the same contract</h2>
          <div className="grid two">
            <div className="card">
              <div className="label">Wallet path</div>
              <h3>Encoded by genlayer-js, signed by your wallet</h3>
              <p className="small">
                The report and owner consoles build the call with <code>genlayer-js</code>, hand it
                to the browser wallet for the signature, and wait for the same finality this page
                reports. The site never sees a private key and there is no backend.
              </p>
            </div>
            <div className="card">
              <div className="label">Write validation</div>
              <h3>SDK path exercised, browser path unchanged</h3>
              <p className="small">
                <code>genlayer-js 1.2.0</code> finalized an owner policy write on the previous
                deployment. The v3 transactions were filed through the CLI; the browser console
                uses the same contract ABI and has not yet filed a v3 case through MetaMask.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <h2>Read it yourself</h2>
          <p className="section-sub">
            The CLI in the repository reads the same state as this page. It needs no wallet for
            status.
          </p>
          <pre>
            <code>{`git clone https://github.com/vincentofweb3/furlough
cd furlough
python3.12 scripts/live_check.py status`}</code>
          </pre>
          <p className="section-sub mb-0">
            Filing a case is permissionless; any testnet key works and Studionet charges no gas,
            but the URL must serve a <code>furlough/journal@3</code> envelope signed by the bound
            observer and naming the bound agent. The <Link href="/report">browser console</Link>{" "}
            does the same through a wallet.
            See{" "}
            <a
              href="https://github.com/vincentofweb3/furlough/blob/master/docs/DEPLOY.md"
              target="_blank"
              rel="noopener noreferrer"
            >
              docs/DEPLOY.md
            </a>{" "}
            for the full smoke test.
          </p>
        </div>
      </section>

      <section>
        <div className="wrap">
          <h2>Tests</h2>
          <p className="section-sub">
            The suite is hermetic: no network, no API key, no live model. A deterministic stand-in is
            keyed on the measured bands, so the gate is meaningful without pretending to prove
            inter-model agreement.
          </p>
          <pre>
            <code>{`python3.12 -m pytest -q
${TEST_COUNT} passed`}</code>
          </pre>
          <div className="grid three">
            <div className="card">
              <span className="num">{TEST_COUNT}</span>
              <div className="num-note">tests, run in seconds</div>
            </div>
            <div className="card">
              <span className="num">0</span>
              <div className="num-note">network calls in the gate</div>
            </div>
            <div className="card">
              <span className="num">1</span>
              <div className="num-note">CI workflow running the same command on every push</div>
            </div>
          </div>
          <p className="small mt-14">
            Each safety claim in{" "}
            <a
              href="https://github.com/vincentofweb3/furlough/blob/master/docs/CONSENSUS.md"
              target="_blank"
              rel="noopener noreferrer"
            >
              CONSENSUS.md
            </a>{" "}
            names the test that would fail if it broke. Claim-to-test mapping:{" "}
            <a
              href="https://github.com/vincentofweb3/furlough/blob/master/references/traceability.md"
              target="_blank"
              rel="noopener noreferrer"
            >
              references/traceability.md
            </a>
            .
          </p>
        </div>
      </section>

      <section>
        <div className="wrap">
          <h2>What is not shown</h2>
          <div className="grid two">
            <div className="card">
              <h3>No live value loop</h3>
              <p className="small">
                The deployed contract has <code>deposited = 0</code>. Custody, draw, atomic settlement and
                recovery semantics are covered by hermetic tests, not by a live funded agent. A live demo needs a funded key
                and a real agent journal.
              </p>
            </div>
            <div className="card">
              <h3>No real inter-model agreement proof</h3>
              <p className="small">
                The consensus path was exercised live; the hermetic gate uses a deterministic test
                model. Proving two real models agree on borderline evidence needs a production
                network.
              </p>
            </div>
            <div className="card">
              <h3>Not audited</h3>
              <p className="small">This is a testnet contribution. Do not use it with real value.</p>
            </div>
            <div className="card">
              <h3>Authenticated, not truthful</h3>
              <p className="small">
                The bound observer must sign the exact case, claim, URL, journal and subject-agent
                bytes; an unsigned or replayed document cannot cut. A compromised observer key can
                still sign false telemetry - authentication is not an oracle, and a distinct agent
                spending key cannot sign evidence; the owner can reassign the agent role.
              </p>
            </div>
          </div>
          <div className="cta-row mt-24">
            <a
              className="btn btn-primary"
              href="https://github.com/vincentofweb3/furlough/blob/master/docs/CONSENSUS.md#11-known-limits"
              target="_blank"
              rel="noopener noreferrer"
            >
              All known limits
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
