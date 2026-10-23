import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How it works - authenticate, reduce, decide, enforce",
  description:
    "The mechanism behind Furlough: signed journal authentication, deterministic reduction, enum-only validator consensus, and a cut enforced by a clock rather than by an operator.",
};

export default function HowPage() {
  return (
    <>
      <section className="hero compact">
        <div className="wrap">
          <span className="kicker">Mechanism</span>
          <h1>Authenticate. Reduce. Decide. Enforce.</h1>
          <p className="lede">
            Furlough splits the problem at the point where it matters: measurement and accounting are
            deterministic contract logic, while the only question sent to a model is one with three
            possible answers. The model&apos;s prose never crosses the consensus boundary, and the
            model&apos;s decision is never what restores the allowance.
          </p>
          <div className="cta-row">
            <Link className="btn btn-ghost" href="/live">
              See it running
            </Link>
            <Link className="btn btn-ghost" href="/verify">
              Check the evidence
            </Link>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <h2>The case lifecycle</h2>
          <p className="section-sub">
            A case is an allegation plus a URL. Filing one is permissionless and costs no fee on
            Studionet; the contract supplies the judgement process.
          </p>
          <div className="steps">
            <div className="step">
              <div className="no">1</div>
              <div>
                <h3>File</h3>
                <p>
                  Anyone calls <code>open_case</code> with a claim, a case id and the URL of the
                  agent&apos;s signed journal envelope. There is no owner gate: a breaker only a
                  trusting operator can trigger is not a breaker. You can do this from the{" "}
                  <Link href="/report">report console</Link>.
                </p>
              </div>
            </div>
            <div className="step">
              <div className="no">2</div>
              <div>
                <h3>Authenticate</h3>
                <p>
                  The envelope must name this contract, chain, case, claim, URL and bound agent,
                  and carry a secp256k1 signature over those fields plus the journal bytes. The
                  contract verifies the signature itself. Unsigned or replayed evidence stops here.
                </p>
              </div>
            </div>
            <div className="step">
              <div className="no">3</div>
              <div>
                <h3>Reduce and decide</h3>
                <p>
                  Only after authentication is the journal collapsed to banded fields. Timestamps,
                  exact counts, tool names, destinations and the journal&apos;s own id are
                  discarded. Every validator re-fetches and re-reduces independently, then compares
                  one enum.
                </p>
              </div>
            </div>
            <div className="step">
              <div className="no">4</div>
              <div>
                <h3>Enforce</h3>
                <p>
                  A confirmed verdict sets <code>expires_at</code>. While the deadline is in the
                  future the allowance reads as zero and <code>draw()</code> is refused. When it
                  passes, the balance is available again with no transaction.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <h2>Stage 1 - authenticate, then reduce</h2>
          <p className="section-sub">
            Before reduction, the envelope is checked against the bound agent. The signature binds
            the contract, chain, case id, claim, journal URL and exact journal bytes, so a document
            signed for one filing cannot be replayed into another. Unsigned evidence never reaches
            a model.
          </p>
          <p className="section-sub">
            The decisive reduction property is not &quot;we summarise the journal&quot;. It is that
            two fetches of the same journal, with every volatile field different, must reduce to a
            byte-identical digest. A journal that merely grew must reduce identically too.
          </p>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Band</th>
                  <th>Measures</th>
                  <th>Why it is stable</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>step_count_band</td>
                  <td>volume of activity</td>
                  <td>fixed for a given journal</td>
                </tr>
                <tr>
                  <td>distinct_tool_band</td>
                  <td>breadth of tools used</td>
                  <td>a set size, fixed</td>
                </tr>
                <tr>
                  <td>target_fanout_band</td>
                  <td>breadth of destinations</td>
                  <td>a set size, fixed</td>
                </tr>
                <tr>
                  <td>repeat_ratio_band</td>
                  <td>concentration on one tool</td>
                  <td>a ratio, stable under drift</td>
                </tr>
                <tr>
                  <td>single_target_share_band</td>
                  <td>concentration on one target</td>
                  <td>a ratio, stable under drift</td>
                </tr>
                <tr>
                  <td>error_ratio_band</td>
                  <td>share of failed steps</td>
                  <td>a ratio, stable under drift</td>
                </tr>
                <tr>
                  <td>spend_band / spend_fraction_band</td>
                  <td>burn against the allowance</td>
                  <td>journal plus contract state, identical on every node</td>
                </tr>
                <tr>
                  <td>authenticated</td>
                  <td>did the bound agent sign this exact case, claim, URL and journal</td>
                  <td>a signature check, identical on every node</td>
                </tr>
                <tr>
                  <td>agent_matches</td>
                  <td>does the journal claim the bound address</td>
                  <td>a boolean</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="section-sub mt-18">
            Volume is not misbehavior: a busy agent and a broken agent can both make sixty calls.
            What separates them is concentration. Ratios are banded rather than counts precisely
            because a 60-versus-61 difference would otherwise change the evidence while nothing
            meaningful changed.
          </p>
          <pre>
            <code>{`{
  "schema": "furlough/journal@2",
  "journal_found": true,
  "authenticated": true,
  "agent_matches": true,
  "step_count_band": "MANY",
  "distinct_tool_band": "ONE",
  "target_fanout_band": "ONE",
  "repeat_ratio_band": "EXTREME",
  "error_ratio_band": "EXTREME",
  "single_target_share_band": "EXTREME",
  "spend_band": "MEDIUM",
  "spend_fraction_band": "UNKNOWN"
}`}</code>
          </pre>
          <p className="small">
            A retry loop against one failing dependency, after authentication and reduction. No
            timestamp, count, tool name or destination survived.
          </p>
        </div>
      </section>

      <section>
        <div className="wrap">
          <h2>Stage 2 - one enum, not a paragraph</h2>
          <p className="section-sub">
            Two models writing two rationales will never produce the same sentence. Comparing prose
            would stall every case forever, which makes the breaker decorative. So the contract
            compares exactly one field.
          </p>
          <div className="grid two">
            <div className="card">
              <div className="label">Compared</div>
              <h3>The verdict</h3>
              <p className="small">
                One of <code>CONFIRMED_MISBEHAVIOR</code>, <code>FALSE_REPORT</code> or{" "}
                <code>INSUFFICIENT_EVIDENCE</code>. Anything outside the set is coerced to{" "}
                <code>INSUFFICIENT_EVIDENCE</code>; a missing field is not agreement.
              </p>
            </div>
            <div className="card">
              <div className="label">Recorded, never compared</div>
              <h3>Rationale and digest</h3>
              <p className="small">
                Both are stored so a reader months later can audit whether a verdict matches the
                evidence. Neither is an input to agreement, and a doctored digest cannot break a
                round.
              </p>
            </div>
          </div>
          <p className="section-sub mt-24 mb-0">
            A round therefore settles whenever the evidence is clear, and aborts when it is genuinely
            borderline. An aborted round cuts nothing: the agent keeps working, and the honest
            outcome of &quot;we could not tell&quot; is public.
          </p>
        </div>
      </section>

      <section>
        <div className="wrap">
          <h2>Stage 3 - the clock is the unlock</h2>
          <p className="section-sub">
            There is no method that lifts a cut early. That is the product claim, and it is checkable
            rather than promised.
          </p>
          <div className="table-wrap">
            <table className="table">
              <tbody>
                <tr>
                  <td>Restoration</td>
                  <td>
                    <code>allowance_remaining()</code> reads node time via{" "}
                    <code>window_closed()</code>. At <code>expires_at</code> the balance returns by
                    itself; no transaction exists to send.
                  </td>
                </tr>
                <tr>
                  <td>Window bound</td>
                  <td>
                    <code>set_default_cut_seconds</code> is clamped to 1..3600 seconds, so no policy
                    can arm a cut longer than an hour.
                  </td>
                </tr>
                <tr>
                  <td>Policy changes</td>
                  <td>
                    Changing the default affects future cases only. It never rewrites an armed{" "}
                    <code>expires_at</code>.
                  </td>
                </tr>
                <tr>
                  <td>Re-pointing</td>
                  <td>
                    <code>set_agent</code> does not clear an open window. Swapping in a compliant
                    agent is not an escape hatch.
                  </td>
                </tr>
                <tr>
                  <td>Overlap</td>
                  <td>
                    A second confirmation composes by taking the later deadline. A false report never
                    shortens a live cut.
                  </td>
                </tr>
                <tr>
                  <td>Record-keeping</td>
                  <td>
                    <code>reap_expired</code> writes <code>lifted_at</code> for the public record. It
                    is cosmetic: the allowance already returned before it could be called.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="mt-34">From the live record</h3>
          <p className="section-sub">
            The signed case, <code>live-v2-auth-1</code>, end to end:
          </p>
          <div className="steps">
            <div className="step">
              <div className="no">T</div>
              <div>
                <h3>00:54:12Z - signed, confirmed and armed</h3>
                <p>
                  Case finalized <code>CONFIRMED_MISBEHAVIOR</code> with{" "}
                  <code>authenticated=True</code>. The allowance reads 0 GEN from this moment. The
                  unsigned copy filed at 00:56:45Z finalized as{" "}
                  <code>INSUFFICIENT_EVIDENCE</code> without reaching a model.
                </p>
              </div>
            </div>
            <div className="step">
              <div className="no">15m</div>
              <div>
                <h3>01:09:12Z - deadline passes</h3>
                <p>
                  Nobody sends anything. <code>window_closed()</code> flips true at the expiry
                  second, inclusive, and the allowance reads the full balance again.
                </p>
              </div>
            </div>
            <div className="step">
              <div className="no">16m</div>
              <div>
                <h3>01:10:50Z - verified operating</h3>
                <p>
                  A public read shows <code>cut_active=false</code> / <code>OPERATING</code>, with the
                  cut recorded as lifted by the clock. Screenshot on the{" "}
                  <Link href="/live">live board</Link>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <h2>Custody and injection</h2>
          <div className="grid two">
            <div className="card">
              <div className="label">Value safety</div>
              <h3>A cut suspends access, never destroys funds</h3>
              <p className="small">
                <code>deposited</code> and <code>drawn</code> are written by exactly two methods,{" "}
                <code>deposit</code> and <code>draw</code>. No adjudication path touches either
                counter. <code>refund</code> is blocked while a cut is live, otherwise the operator
                could withdraw the balance and fund a fresh wallet. A transfer is emitted inside the
                calling turn; a synchronous failure reverts the counter, and a later child failure
                returns through the refund callback or <code>reconcile()</code>.
              </p>
            </div>
            <div className="card">
              <div className="label">Injection</div>
              <h3>The model can only say one of three words</h3>
              <p className="small">
                The claim and every journal field are attacker-controlled. The verdict is validated
                against the enum; the claim is flattened so it cannot close its own delimiter; the
                measurements are labelled authoritative and placed first. The worst an injection can
                achieve is <code>INSUFFICIENT_EVIDENCE</code> - a deliberate fail-open choice,
                because failing closed would hand anyone a denial-of-service against any agent.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <h2>What this does not claim</h2>
          <p className="section-sub">
            Stated plainly, with the test that would fail if the claim broke.
          </p>
          <div className="grid two">
            <div className="card">
              <h3>Not audited</h3>
              <p className="small">A testnet contribution. Do not use it with real value.</p>
            </div>
            <div className="card">
              <h3>Authenticated is not truthful</h3>
              <p className="small">
                The contract proves the envelope came from the bound agent&apos;s key, not that the
                telemetry inside it is honest. A compromised agent key can still sign a false
                journal; a missing journal host fails open as{" "}
                <code>INSUFFICIENT_EVIDENCE</code>.
              </p>
            </div>
            <div className="card">
              <h3>The live value loop is unfunded</h3>
              <p className="small">
                The v2 deployment has <code>deposited = 0</code>. Deposit, draw, atomic settlement
                and recovery are covered by tests, not by real GEN on chain.
              </p>
            </div>
            <div className="card">
              <h3>Bands are hand-calibrated</h3>
              <p className="small">
                Chosen against fixtures, plausible rather than validated against real agent traffic.
                Production wants distributions, which is governance as much as engineering.
              </p>
            </div>
            <div className="card">
              <h3>The hermetic gate does not prove two real models agree</h3>
              <p className="small">
                The test model is a deterministic stand-in keyed on the evidence. Real inter-model
                agreement needs a live network.
              </p>
            </div>
          </div>
          <div className="cta-row mt-24">
            <a
              className="btn btn-ghost"
              href="https://github.com/vincentofweb3/furlough/blob/master/docs/CONSENSUS.md"
              target="_blank"
              rel="noopener noreferrer"
            >
              Full safety argument
            </a>
            <a
              className="btn btn-ghost"
              href="https://github.com/vincentofweb3/furlough/blob/master/contracts/agent_breaker.py"
              target="_blank"
              rel="noopener noreferrer"
            >
              Contract source
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
