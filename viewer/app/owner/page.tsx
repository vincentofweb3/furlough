import type { Metadata } from "next";
import Link from "next/link";
import OwnerPanel from "@/components/OwnerPanel";

export const metadata: Metadata = {
  title: "Owner console",
  description:
    "Owner-only policy controls for Furlough: set the default cut window, point the contract at an agent, and record an expired window. None of these can lift an armed cut.",
};

export default function OwnerPage() {
  return (
    <>
      <section className="hero compact">
        <div className="wrap">
          <span className="kicker">Owner console</span>
          <h1 className="page-title">The owner can change policy. Not the clock.</h1>
          <p className="lede">
            These controls change who is bound and how long future cuts last. They cannot shorten,
            extend or clear an armed window. That asymmetry is the product: the operator funds the
            agent, so the operator must not be able to undo the breaker.
          </p>
          <div className="chips">
            <span className="chip">owner-gated writes</span>
            <span className="chip">future cases only</span>
            <span className="chip">no unlock method</span>
          </div>
        </div>
      </section>

      <section className="pt-0">
        <div className="wrap">
          <OwnerPanel />
        </div>
      </section>

      <section>
        <div className="wrap">
          <h2>What the owner can and cannot do</h2>
          <div className="grid three">
            <div className="card">
              <div className="label">Can</div>
              <h3>Set the default window</h3>
              <p className="small">
                <code>set_default_cut_seconds</code> is clamped to 1..3600. It applies to future
                confirmations only.
              </p>
            </div>
            <div className="card">
              <div className="label">Can</div>
              <h3>Point at another agent</h3>
              <p className="small">
                <code>set_agent</code> changes who is bound. It does not clear an open window;
                swapping agents is not an escape hatch.
              </p>
            </div>
            <div className="card">
              <div className="label">Cannot</div>
              <h3>Lift a cut</h3>
              <p className="small">
                No method exists. <code>reap_expired</code> only records an expiry that already
                happened; the allowance returned before it could run.
              </p>
            </div>
          </div>
          <p className="section-sub mt-24 mb-0">
            Need to file instead? <Link href="/report">The report console is permissionless</Link>.
            Read the mechanism in <Link href="/how">How it works</Link>, or check the deployment on
            the <Link href="/verify">evidence page</Link>.
          </p>
        </div>
      </section>
    </>
  );
}
