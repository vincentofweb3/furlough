import type { Metadata } from "next";
import Link from "next/link";
import ReportForm from "@/components/ReportForm";

export const metadata: Metadata = {
  title: "File a case",
  description:
    "File a case against an autonomous agent. Permissionless, wallet-signed, and adjudicated by GenLayer validator consensus on Studionet.",
};

export default function ReportPage() {
  return (
    <>
      <section className="hero compact">
        <div className="wrap">
          <span className="kicker">Report console</span>
          <h1 className="page-title">File it. The contract does the rest.</h1>
          <p className="lede">
            A case is an allegation plus a public journal URL. Filing is permissionless and free on
            Studionet; the wallet is only your signature. Validators fetch the evidence
            independently, compare one enum, and the clock enforces the cut.
          </p>
          <div className="chips">
            <span className="chip">no owner gate</span>
            <span className="chip">zero fee</span>
            <span className="chip">testnet only</span>
            <Link className="chip" href="/how">
              what happens after filing
            </Link>
          </div>
        </div>
      </section>

      <section className="pt-0">
        <div className="wrap">
          <div className="split">
            <ReportForm />

            <aside className="stack">
              <div className="card">
                <div className="label">What happens next</div>
                <div className="steps compact">
                  <div className="step">
                    <div className="no">1</div>
                    <div>
                      <h3>Wallet signature</h3>
                      <p>Your address becomes the reporter of record. No fee is charged.</p>
                    </div>
                  </div>
                  <div className="step">
                    <div className="no">2</div>
                    <div>
                      <h3>Journal fetch</h3>
                      <p>
                        The leader fetches the URL and reduces it to a banded digest. Every
                        validator re-fetches independently.
                      </p>
                    </div>
                  </div>
                  <div className="step">
                    <div className="no">3</div>
                    <div>
                      <h3>One enum</h3>
                      <p>
                        Validators compare <code>CONFIRMED_MISBEHAVIOR</code>, <code>FALSE_REPORT</code>{" "}
                        or <code>INSUFFICIENT_EVIDENCE</code>. Prose is recorded, never compared.
                      </p>
                    </div>
                  </div>
                  <div className="step">
                    <div className="no">4</div>
                    <div>
                      <h3>Clock, not keeper</h3>
                      <p>
                        A confirmation sets the allowance to zero until <code>expires_at</code>. Then
                        it returns itself. There is no unlock transaction.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="label">Honest limits</div>
                <p className="small">
                  The journal is trusted infrastructure: validators fetch it, but nothing proves the
                  agent authored it. Signed digests are the next build. Bands are hand-calibrated. The
                  live deployment has no funded value loop.
                </p>
                <p className="small mb-0">
                  A case is not a claim on funds and cannot move the balance. The worst a false case
                  can do is cost a consensus round; the worst a confirmed one can do is suspend
                  access for at most one hour.
                </p>
              </div>

              <div className="card">
                <div className="label">No key handling</div>
                <p className="small mb-0">
                  This site never asks for a private key or seed phrase. It uses your browser
                  wallet&apos;s standard provider and the public Studionet RPC. Reads work with no
                  wallet at all.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <h2>Who can file?</h2>
          <div className="grid three">
            <div className="card">
              <div className="label">Anyone</div>
              <h3>No allowlist</h3>
              <p className="small">
                A stranger, a competing operator, the agent&apos;s own monitoring loop. The owner
                cannot suppress a filing.
              </p>
            </div>
            <div className="card">
              <div className="label">The owner</div>
              <h3>Same rules apply</h3>
              <p className="small">
                Owner filings are not privileged. The verdict is still consensus, and the window is
                still the clock.
              </p>
            </div>
            <div className="card">
              <div className="label">The agent</div>
              <h3>Can report itself</h3>
              <p className="small">
                An agent that notices its own loop can file against itself. The contract does not
                care who the reporter is.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
