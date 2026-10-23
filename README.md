# Furlough

**An adjudicated circuit breaker for an autonomous AI agent.**
A GenLayer Intelligent Contract that reads an agent's own telemetry, asks validator consensus
whether it was misbehaving, and if so cuts its spend allowance - until a deadline that passes
on its own.

Nobody performs the cut. Nobody lifts it. A wrong cut reverses itself.

```python
open_case('{"case_id":…, "claim":…, "journal_url":…}')   # anyone may report
        │
        ▼
   GenLayer consensus → CONFIRMED_MISBEHAVIOR
        │
        ▼
allowance_remaining() == 0        ────── expires_at passes ──────▶  == full balance
                                   (no transaction, no human)
```

---

## The problem

An autonomous agent holding a real spend allowance can be turned against itself: a prompt
injection in a tool result, a dependency quietly returning garbage, a retry loop, a runaway
fan-out. The agent that is misbehaving is also the only party positioned to notice it, and the
operator that funded it is the party least likely to admit it.

What exists today is advisory. A human watches a dashboard and pulls a kill switch. A rate
limiter caps throughput but cannot tell "looping on a failing endpoint" from "working hard". A
monitoring vendor sends an alert. In every case the action is performed by a human, or not
performed at all.

Furlough removes the human from both ends and replaces them with consensus over measured
evidence.

---

## What makes it different

| | Human kill switch | Rate limiter | Monitoring alert | **Furlough** |
| --- | --- | --- | --- | --- |
| Who acts | a privileged key | nobody | nobody | validator consensus |
| Bound by time | no | no | no | **yes, always** |
| Wrong action self-corrects | no | n/a | n/a | **yes, at expiry** |
| Operator can suppress it | **yes** | yes | yes | **no - cases are permissionless** |
| Destroys funds | no | no | no | **never** |
| Auditable afterwards | no | no | partly | **yes, every field public** |

---

## How it works

Four stages, following the GenLayer idiom.

**Stage 1 - authenticate evidence, no model.** The leader fetches a `furlough/journal@2`
envelope from the agent's URL and verifies the bound agent's secp256k1 signature over this
contract, chain, case, claim, URL and journal bytes. Unsigned, tampered or replayed documents
stop here, before any model call.

**Stage 2 - deterministic reduction, no model.** The signed journal is reduced to a stable-field
digest *inside* the nondet block. Every timestamp, every exact count, and every raw identifier is
dropped. What survives is bands:

```
step_count_band · distinct_tool_band · repeat_ratio_band · error_ratio_band
target_fanout_band · single_target_share_band · spend_band · spend_fraction_band
```

Volume is not misbehavior. What distinguishes a broken agent from a busy one is
**concentration** - many steps through one tool to one destination, mostly erroring. Ratios
band far more stably than counts, which is why the reduction keeps them.

**Stage 3 - consensus on one enum.** Validators independently re-fetch, re-authenticate,
re-reduce and re-derive.

```
CONFIRMED_MISBEHAVIOR   → cut the allowance until expires_at
FALSE_REPORT            → nothing
INSUFFICIENT_EVIDENCE   → nothing
```

**Stage 4 - enforce with a clock.** A confirmed verdict writes the cut. `allowance_remaining()`
reads the clock, so expiry restores the allowance with no transaction and no unlock method.

Rationale is free text that two models will never write identically; comparing it would stall
every round forever, and no agent could ever be stopped.

**Stage 3 - retention.** Verdict, rationale, digest, window and provenance are all publicly
readable. Reads need no wallet.

---

## Quick start

Requires Python 3.12 and the GenLayer Python SDK.

```bash
python3.12 scripts/check_env.py    # verify the pinned GenVM bundle resolves
python3.12 -m pytest -q            # 106 hermetic tests, no network, no API key
```

If the suite fails with `cannot import name 'gl' from 'genlayer'`, that is an environment problem,
not a contract problem - run `python3.12 scripts/check_env.py --fix`. It is explained in
[`docs/DEPLOY.md`](docs/DEPLOY.md).

Against the live deployment (read-only, no wallet):

```bash
python3.12 scripts/live_check.py status
```

Deploying to Studionet is covered in [`docs/DEPLOY.md`](docs/DEPLOY.md).

---

## Live on Studionet

Deployed on 23 October 2026. The live record now covers the two rejection findings directly: a
signed journal cuts, an unsigned copy of the same bytes does not, and a signed benign journal is
a false report.

| | |
| --- | --- |
| Contract | `0x84795e25Ae0BF5337829b614493D054c1c15c907`, chain 61999 (deploy tx `0x04d2cfa2…53e2f1`) |
| Bound agent | `0x7adE3852187F6FDAC7798c826620F49a9D529964` |
| Status board | https://furlough-dt8b.vercel.app/ - every field is a free, walletless read |
| Report console | https://furlough-dt8b.vercel.app/report/ - file a case from a browser wallet; permissionless and zero-fee |
| Owner console | https://furlough-dt8b.vercel.app/owner/ - change future policy only; no method can lift an armed cut |
| Pages mirror | https://vincentofweb3.github.io/furlough/ - the same static export, rebuilt by CI |
| `live-v2-auth-1` | signed runaway envelope, `CONFIRMED_MISBEHAVIOR`, `authenticated=True`; tx `0xe476c030…69f5d3`; cut armed 00:54:12Z, lifted by the clock at 01:09:12Z |
| `live-v2-benign-1` | signed ordinary-work envelope, `FALSE_REPORT`, `authenticated=True`; tx `0xb6090a9f…414ca8` |
| `live-v2-unsigned-1` | same journal bytes without a signature, `INSUFFICIENT_EVIDENCE`, `authenticated=False`, no model consulted; tx `0xfcac4e30…f7f8151` |

The signed cut ran for the default 900s and lifted with no transaction. The case record itself
shows `journal fetched true - signed by the bound agent true` on the signed cases and `false` on
the unsigned one.

Verify any of it on [GenLayer Studio Explorer](https://explorer-studio.genlayer.com) - paste the
tx hash or the contract address - or re-read the contract directly:

```bash
python3.12 scripts/live_check.py status

# file your own case with a signed envelope
set -a; . ./.env; set +a
python3.12 scripts/sign_journal.py \
  --contract 0x84795e25Ae0BF5337829b614493D054c1c15c907 \
  --case-id my-case --claim "The agent looped on one failing endpoint." \
  --journal-url https://example.com/my-envelope.json \
  --journal-file journal.json --out envelope.json
python3.12 scripts/live_check.py open-case \
  --journal-url https://example.com/my-envelope.json \
  --claim "The agent looped on one failing endpoint."
```

The live deployment has `deposited == 0`, so the GEN transfer path was not exercised with real
value. Deposit, draw, refund, callback recovery and `reconcile()` are covered by the settlement
tests and disclosed as a limit rather than implied.

---

## Repository layout

| Path | What it is |
| --- | --- |
| `contracts/agent_breaker.py` | The Intelligent Contract. Authenticate, reduce, decide, enforce. |
| `tests/direct/` | Hermetic gate: 106 tests, no network, no API key |
| `docs/CONSENSUS.md` | The safety argument, written to be disputed, claim-by-claim mapped to tests |
| `docs/SPEC.md` | Scope, architecture, data flow, explicit out-of-scope |
| `docs/DEPLOY.md` | Studionet deployment |
| `deploy/` | Deployment script |
| `scripts/check_env.py` | Verifies the pinned GenVM bundle resolves, fetches the mirror on a fresh machine, repairs a polluted cache |
| `scripts/live_check.py` | Live status board; files permissionless cases (zero-fee on Studionet) |
| `scripts/sign_journal.py` | Builds the `furlough/journal@2` envelope that `open_case` authenticates |
| `viewer/` | Next.js + TypeScript static-export site: overview, mechanism, live board, evidence, wallet-connected report console, owner console. Deployed on Vercel, mirrored by GitHub Pages |
| `references/traceability.md` | Criterion → feature → code → test → demo moment |

---

## Tests

On a fresh machine, seed the pinned SDK bundle once. Upstream removed the tarball that
`genlayer-test` 0.29.2 requests, so the repository mirrors it and verifies a pinned sha256:

```bash
python3.12 scripts/check_env.py --fetch
```

```bash
$ python3.12 -m pytest -q
106 passed
```

Six files, each proving one thing:

| File | Proves |
| --- | --- |
| `test_consensus_gate.py` | all three verdicts are reachable; the validator compares the enum and nothing else; injection and out-of-enum output are contained |
| `test_reduction.py` | volatile fields cannot change a digest; no raw identifier survives; concentration bands distinguish a loop from ordinary work |
| `test_cut_and_expiry.py` | the cut bites, self-lifts, cannot be shortened by the owner, cannot be escaped by re-pointing the agent, and composes correctly |
| `test_custody.py` | value is conserved; deposit, draw and refund are access-controlled; adjudication never moves a counter |
| `test_evidence_authentication.py` | only a signature bound to this contract, chain, case, claim, URL and journal can cut; unsigned, wrong-signer and replay attempts cannot |
| `test_settlement.py` | synchronous transfer failure leaves accounting untouched; a later failure is recovered by the callback or `reconcile()` |

The suite runs entirely against recorded fixtures with the web fetch and the model both mocked.
The mock model is keyed on the **measured bands**, not on the expected answer - so if the
contract ever stopped forwarding evidence to the model, the patterns would stop matching and
the expected verdicts would not be produced. That is what makes the gate a test rather than a
tautology.

---

## Why GenLayer

This is not a judgement that could be made by a lookup table or a rules engine, and it is not
one that a single model should make either. It needs to be made by parties who are independent
of the agent *and* of the operator funding it - and it needs to be final, because a breaker you
can argue with is a breaker you cannot rely on.

That is the gap the agentic-commerce stack has not closed. Every layer being built - x402,
ERC-8004, A2A, ACP - engineers the happy path. None ships dispute resolution. GenLayer is the
adjudication layer, and this is adjudication applied to the one participant that cannot be
trusted to police itself.

Three properties fall out of using consensus rather than a model call:

1. **The operator cannot suppress a case.** A breaker only the trusting owner can trigger is
   not a breaker.
2. **A wrong verdict is bounded and self-reversing**, so being wrong is cheap.
3. **No model sits in the correctness path for the parts that must be exact** - accounting,
   expiry, access control are all deterministic.

---

## Honest limits

- **Not audited.** Testnet contribution. Do not use with real value.
- **The journal is authenticated, not truthful.** The contract verifies a secp256k1 signature
  from the bound agent over this exact case, claim, URL and journal, so a stranger cannot cut.
  A compromised agent key can still sign false telemetry, and a missing journal host fails open
  as `INSUFFICIENT_EVIDENCE`.
- **Bands are hand-calibrated** against fixtures, not derived from real agent traffic.
- **The live value loop is unfunded.** The v2 deployment has `deposited == 0`, so deposit, draw,
  refund and recovery are proven by tests, not with real GEN on chain.
- **The hermetic gate does not prove two different real models agree.** It uses a deterministic
  stand-in. Three live cases finalized under validator consensus, but three cases are not proof.
- **Single agent per contract.** Swarms are out of scope by decision.
- **The consoles hold no keys and cannot lift a cut.** The status board renders free walletless
  reads. The report console calls `open_case`; the owner console changes future policy and can
  record an already-expired window. Signing happens in the visitor's browser wallet; there is no
  backend and no private key on the site. The SDK write path is proven by one owner policy
  transaction on the previous deployment, not yet by a case filed through MetaMask. The site's
  argument stands on the contract, the tests and the live transactions, not on the pages.

Full list with reasoning: [`docs/CONSENSUS.md` §11](docs/CONSENSUS.md).

---

## Licence

MIT.