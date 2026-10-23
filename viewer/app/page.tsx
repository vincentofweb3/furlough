import Link from "next/link";
import LiveStrip from "@/components/LiveStrip";

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="wrap">
          <span className="kicker">Live on GenLayer Studionet</span>
          <h1>
            Nobody pulls the brake. <em>Nobody lets it go.</em>
          </h1>
          <p className="lede">
            Furlough is an Intelligent Contract that audits an autonomous agent&apos;s own telemetry,
            asks validator consensus whether it misbehaved, and cuts its spend allowance until a
            deadline that expires on its own. <strong>No kill-switch operator. No unlock
            transaction.</strong>
          </p>
          <div className="cta-row">
            <Link className="btn btn-primary" href="/report">
              File a case
            </Link>
            <Link className="btn btn-ghost" href="/live">
              Watch the live breaker
            </Link>
            <Link className="btn btn-ghost" href="/how">
              How it works
            </Link>
          </div>

          <LiveStrip />
          <p className="small mt-14">
            Reads need no wallet. Filing is permissionless; the report console uses your wallet only
            to sign the filing.
          </p>
        </div>
      </section>

      <section>
        <div className="wrap">
          <h2>The failure mode</h2>
          <p className="section-sub">
            An agent holding a real spend allowance can be turned against itself. The agent that is
            misbehaving is also the only party positioned to notice it - and the operator that funded
            it is the party least likely to admit it.
          </p>
          <div className="grid three">
            <div className="card">
              <div className="label">Input</div>
              <h3>Prompt injection</h3>
              <p className="small">
                A tool result, a fetched page, a dependency reply - text the agent treats as
                instructions and forwards into its next action.
              </p>
            </div>
            <div className="card">
              <div className="label">Environment</div>
              <h3>Dependency rot</h3>
              <p className="small">
                An API starts returning garbage, and the agent keeps spending against it because
                nothing in its loop distinguishes failure from work.
              </p>
            </div>
            <div className="card">
              <div className="label">Behaviour</div>
              <h3>Retry loops</h3>
              <p className="small">
                One failing endpoint, dozens of attempts, an allowance draining in a pattern every
                monitoring tool will call &quot;traffic&quot;.
              </p>
            </div>
          </div>
          <p className="section-sub mt-26 mb-0">
            Today&apos;s controls are advisory. A human watches a dashboard and pulls a kill switch. A
            rate limiter caps throughput but cannot tell looping from working hard. An alert waits
            for someone to act. In every case the action is performed by a human, or not performed at
            all. Furlough removes the human from both ends and replaces them with consensus over
            measured evidence.
          </p>
        </div>
      </section>

      <section>
        <div className="wrap">
          <h2>How the judgement is made</h2>
          <p className="section-sub">
            Four stages, following the GenLayer idiom. Only one of them involves a model, and the
            model&apos;s words never cross the consensus boundary.
          </p>
          <div className="steps">
            <div className="step">
              <div className="no">1</div>
              <div>
                <h3>Authenticate the evidence</h3>
                <p>
                  The journal must carry a <code>furlough/journal@2</code> envelope signed by the
                  bound agent over this contract, chain, case, claim, URL and journal bytes.
                  Unsigned, tampered or replayed documents stop here, before any model call.
                </p>
              </div>
            </div>
            <div className="step">
              <div className="no">2</div>
              <div>
                <h3>Reduce before consensus</h3>
                <p>
                  The leader fetches the signed journal and collapses it to a banded,
                  identifier-free digest. Timestamps, exact counts and raw IDs are dropped;
                  concentration ratios survive. A journal that merely grew reduces byte-identically.
                </p>
              </div>
            </div>
            <div className="step">
              <div className="no">3</div>
              <div>
                <h3>Ask for one enum</h3>
                <p>
                  Validators independently re-fetch, re-authenticate, re-reduce and re-derive, then
                  compare <code>CONFIRMED_MISBEHAVIOR</code>, <code>FALSE_REPORT</code> or{" "}
                  <code>INSUFFICIENT_EVIDENCE</code>. Rationale is free text two models will never
                  write identically, so it is recorded and never compared.
                </p>
              </div>
            </div>
            <div className="step">
              <div className="no">4</div>
              <div>
                <h3>Enforce with a clock</h3>
                <p>
                  A confirmed verdict sets the allowance to zero until <code>expires_at</code>. When
                  the window passes, <code>allowance_remaining()</code> reads the clock and returns
                  the full balance again. No method lifts a cut; there is nothing to sign.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <h2>Three verdicts, one of them acts</h2>
          <p className="section-sub">
            The output space is deliberately small. A breaker that fires on everything is not a
            breaker, and a model that can invent a fourth option is not an oracle.
          </p>
          <div className="grid three">
            <div className="card">
              <span className="badge confirmed">CONFIRMED_MISBEHAVIOR</span>
              <h3 className="mt-14">Allowance to zero</h3>
              <p className="small">
                The evidence shows the bound agent looping, spraying or otherwise burning its
                allowance. The custodied funds stay put; access is suspended until the deadline.
              </p>
            </div>
            <div className="card">
              <span className="badge false-report">FALSE_REPORT</span>
              <h3 className="mt-14">Nothing happens</h3>
              <p className="small">
                The journal is reachable and describes ordinary work. The case is recorded publicly;
                the allowance is untouched.
              </p>
            </div>
            <div className="card">
              <span className="badge insufficient">INSUFFICIENT_EVIDENCE</span>
              <h3 className="mt-14">Nothing happens</h3>
              <p className="small">
                The journal is missing, unreadable, unsigned, replayed or inconclusive. The contract
                never treats &quot;could not tell&quot; as &quot;guilty&quot;.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <h2>Why this needs consensus</h2>
          <div className="grid three">
            <div className="card">
              <div className="label">Permissionless</div>
              <h3>The operator cannot suppress a case</h3>
              <p className="small">
                Anyone may file one, but only a journal signed by the bound agent can cut. The
                operator cannot suppress a case, and an anonymous document cannot open one.
              </p>
            </div>
            <div className="card">
              <div className="label">Bounded</div>
              <h3>Being wrong is cheap</h3>
              <p className="small">
                A wrong cut is capped at one hour and reverses itself with no transaction. Recovery
                is the default, not an action.
              </p>
            </div>
            <div className="card">
              <div className="label">Deterministic</div>
              <h3>No model where exactness matters</h3>
              <p className="small">
                Accounting, expiry and access control are plain contract logic. The model only
                chooses among three words.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <h2>Evidence, not adjectives</h2>
          <p className="section-sub">
            Every claim on this site has a public artifact behind it: a finalized transaction, a
            test, or a documented limit.
          </p>
          <div className="grid four">
            <div className="card">
              <span className="num">3</span>
              <div className="num-note">live cases: confirmed, false report, insufficient evidence</div>
            </div>
            <div className="card">
              <span className="num">1</span>
              <div className="num-note">signed cut lifted by the clock, zero transactions</div>
            </div>
            <div className="card">
              <span className="num">106</span>
              <div className="num-note">hermetic tests, no network, no API key</div>
            </div>
            <div className="card">
              <span className="num">1</span>
              <div className="num-note">contract. No backend, no oracle, no keeper.</div>
            </div>
          </div>
          <div className="cta-row mt-24">
            <Link className="btn btn-ghost" href="/verify">
              See the transactions and test commands
            </Link>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <h2>Read the contract. Dispute the argument.</h2>
          <p className="section-sub">
            The safety case is written to be attacked, claim by claim, with each one mapped to the
            test that would fail if it broke.
          </p>
          <div className="cta-row">
            <a
              className="btn btn-primary"
              href="https://github.com/vincentofweb3/furlough/blob/master/contracts/agent_breaker.py"
              target="_blank"
              rel="noopener noreferrer"
            >
              Read the Intelligent Contract
            </a>
            <a
              className="btn btn-ghost"
              href="https://github.com/vincentofweb3/furlough/blob/master/docs/CONSENSUS.md"
              target="_blank"
              rel="noopener noreferrer"
            >
              Safety argument
            </a>
            <Link className="btn btn-ghost" href="/report">
              File a case
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
