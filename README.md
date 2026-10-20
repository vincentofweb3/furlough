# Furlough

**An adjudicated circuit breaker for an autonomous AI agent.**
A GenLayer Intelligent Contract that reads an agent's own telemetry, asks validator consensus
whether it was misbehaving, and if so cuts its spend allowance — until a deadline that passes
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
| Operator can suppress it | **yes** | yes | yes | **no — cases are permissionless** |
| Destroys funds | no | no | no | **never** |
| Auditable afterwards | no | no | partly | **yes, every field public** |

---

## How it works

Three stages, following the GenLayer idiom.

**Stage 1 — deterministic evidence, no model.** The leader fetches the agent's journal from a
URL and reduces it to a stable-field digest *inside* the nondet block. Every timestamp, every
exact count, and every raw identifier is dropped. What survives is bands:

```
step_count_band · distinct_tool_band · repeat_ratio_band · error_ratio_band
target_fanout_band · single_target_share_band · spend_band · spend_fraction_band
```

Volume is not misbehavior. What distinguishes a broken agent from a busy one is
**concentration** — many steps through one tool to one destination, mostly erroring. Ratios
band far more stably than counts, which is why the reduction keeps them.

**Stage 2 — consensus on one enum.**

```
CONFIRMED_MISBEHAVIOR   → cut the allowance until expires_at
FALSE_REPORT            → nothing
INSUFFICIENT_EVIDENCE   → nothing
```

Validators independently re-fetch, re-reduce and re-derive, and compare **only the enum**.
Rationale is free text that two models will never write identically; comparing it would stall
every round forever, and no agent could ever be stopped.

**Stage 3 — retention.** Verdict, rationale, digest, window and provenance are all publicly
readable. Reads need no wallet.

---

## Quick start

Requires Python 3.12 and the GenLayer Python SDK.

```bash
python3.12 scripts/check_env.py    # verify the pinned GenVM bundle resolves
python3.12 -m pytest -q            # 87 hermetic tests, no network, no API key
```

If the suite fails with `cannot import name 'gl' from 'genlayer'`, that is an environment problem,
not a contract problem — run `python3.12 scripts/check_env.py --fix`. It is explained in
[`docs/DEPLOY.md`](docs/DEPLOY.md).

Deploying to Studionet is covered in [`docs/DEPLOY.md`](docs/DEPLOY.md).

---

## Repository layout

| Path | What it is |
| --- | --- |
| `contracts/agent_breaker.py` | The Intelligent Contract. Stage 1, 2 and 3. |
| `tests/direct/` | Hermetic gate: 87 tests, no network, no API key |
| `docs/CONSENSUS.md` | The safety argument, written to be disputed, claim-by-claim mapped to tests |
| `docs/SPEC.md` | Scope, architecture, data flow, explicit out-of-scope |
| `docs/DEPLOY.md` | Studionet deployment |
| `deploy/` | Deployment script |
| `scripts/check_env.py` | Verifies the pinned GenVM bundle resolves; repairs a polluted cache |
| `references/traceability.md` | Criterion → feature → code → test → demo moment |

---

## Tests

```bash
$ python3.12 -m pytest -q
87 passed
```

Four files, each proving one thing:

| File | Proves |
| --- | --- |
| `test_consensus_gate.py` | all three verdicts are reachable; the validator compares the enum and nothing else; injection and out-of-enum output are contained |
| `test_reduction.py` | volatile fields cannot change a digest; no raw identifier survives; concentration bands distinguish a loop from ordinary work |
| `test_cut_and_expiry.py` | the cut bites, self-lifts, cannot be shortened by the owner, cannot be escaped by re-pointing the agent, and composes correctly |
| `test_custody.py` | value is conserved; deposit, draw and refund are access-controlled; adjudication never moves a counter |

The suite runs entirely against recorded fixtures with the web fetch and the model both mocked.
The mock model is keyed on the **measured bands**, not on the expected answer — so if the
contract ever stopped forwarding evidence to the model, the patterns would stop matching and
the expected verdicts would not be produced. That is what makes the gate a test rather than a
tautology.

---

## Why GenLayer

This is not a judgement that could be made by a lookup table or a rules engine, and it is not
one that a single model should make either. It needs to be made by parties who are independent
of the agent *and* of the operator funding it — and it needs to be final, because a breaker you
can argue with is a breaker you cannot rely on.

That is the gap the agentic-commerce stack has not closed. Every layer being built — x402,
ERC-8004, A2A, ACP — engineers the happy path. None ships dispute resolution. GenLayer is the
adjudication layer, and this is adjudication applied to the one participant that cannot be
trusted to police itself.

Three properties fall out of using consensus rather than a model call:

1. **The operator cannot suppress a case.** A breaker only the trusting owner can trigger is
   not a breaker.
2. **A wrong verdict is bounded and self-reversing**, so being wrong is cheap.
3. **No model sits in the correctness path for the parts that must be exact** — accounting,
   expiry, access control are all deterministic.

---

## Honest limits

- **Not audited.** Testnet contribution. Do not use with real value.
- **The journal is trusted infrastructure.** Validators fetch it independently, but nothing
  proves the agent wrote it rather than someone posing as it. Agent-signed digest commitment is
  the obvious fix and the first thing to build after this.
- **Bands are hand-calibrated** against fixtures, not derived from real agent traffic.
- **The hermetic gate does not prove two different real models agree.** It uses a deterministic
  stand-in; real inter-model agreement needs a live network.
- **Single agent per contract.** Swarms are out of scope by decision.
- **No frontend.** Judged by stewards on novelty, complexity and impact — one week was better
  spent on the contract and its argument than on a dashboard.

Full list with reasoning: [`docs/CONSENSUS.md` §11](docs/CONSENSUS.md).

---

## Licence

MIT.