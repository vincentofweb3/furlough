# Furlough - Specification

Status: Stage 5 exit. Timebox: one week. Target: GenLayer incentivized Builder Program.

---

## One-line pitch

> For **operators of autonomous AI agents that hold real money**, who cannot supervise
> every action, this is **a GenLayer Intelligent Contract that adjudicates an agent's own
> behaviour and cuts its spend allowance** until an immutable expiry.
> Unlike a human kill switch, a rate limiter, or a monitoring dashboard, it **acts without a
> human, expires on its own, and a wrong cut reverses itself**.

---

## Problem statement

- **Problem**: An autonomous agent holding a spend allowance can be turned against itself -
  a prompt injection in a tool result, a degraded dependency returning garbage, a retry loop,
  or a runaway fan-out. The agent that is misbehaving is also the only party positioned to
  notice it.
- **Who has it**: anyone running an agent with a funded wallet or budget, which in 2026 is
  every agentic-commerce team.
- **What they do today instead**: a human watches a dashboard and pulls a kill switch; or a
  rate limiter caps throughput; or a monitoring vendor emails an alert. Every one of those is
  advisory. The action is performed by a human, or not performed at all.
- **Cost of the status quo**: the failure mode is not a bad alert, it is money moving. A rate
  limiter cannot distinguish "looping on a failing endpoint" from "working hard", and a human
  kill switch is a single unaccountable key - the same criticism circuit breakers attract in
  DeFi.
- **Why GenLayer cares**: this is the dispute-resolution gap in the agentic-commerce stack.
  Every layer being built (x402, ERC-8004, A2A, ACP) engineers the happy path; none ships
  adjudication. Furlough is adjudication applied to the one participant that cannot be trusted
  to police itself.

---

## Personas

| Persona | Role | Need | Success looks like |
| --- | --- | --- | --- |
| Primary | Agent operator / treasury owner | Bounded, automatic loss containment | A misbehaving window is cut within one consensus round, and a false report costs nothing |
| Secondary | Bystander reporter | A way to raise a case without being the operator | Anyone can open a case; the operator cannot suppress it |
| Tertiary | Auditor | To check what happened after the fact | Every verdict, the evidence digest, and the window are publicly readable and bound to a finalized tx |

---

## Value proposition

- **Core value delivered**: An irreversible, self-lifting, consensus-authorised brake on an
  agent's ability to spend.
- **Measurable outcome**: `allowance_remaining()` returns `0` from the moment a verdict
  finalises until `expires_at`, and returns to its prior value automatically afterwards, with
  zero human transactions in the recovery path.
- **Rubric criteria served**: *novelty* (no equivalent exists - no on-chain circuit breaker for
  AI agents where no human performs the action), *complexity* (independent-fetch consensus with
  an anti-equivocation reduction, plus custodied value accounting), *impact* (Tools &
  Infrastructure category, and a deployed contract that earns dev fees).

---

## Core user journeys

**Journey 1 - the confirmed cut (primary path)**

1. Operator calls `deposit()` to fund the custodian balance and `set_agent()` to bind an agent address.
2. Agent draws against its allowance via `draw(amount)`; draws succeed.
3. A bystander (or the operator, or a watchdog) calls `open_case(payload_json)`, where the payload
   is a JSON object carrying `case_id`, `claim` and `journal_url`.
4. The leader fetches the agent's journal from `journal_url`, reduces it to stable fields, and
   asks the model for one of three verdicts. Validators independently re-fetch, re-reduce and
   re-derive, comparing **only the enum**.
5. `CONFIRMED_MISBEHAVIOR` finalises → `allowance_remaining()` returns `0` until `expires_at`.
6. After `expires_at`, `allowance_remaining()` returns the full prior value. No transaction
   from any human restores it.

**Journey 2 - the false report (secondary path, in scope)**

1. Same steps 1–3, but the journal is ordinary agent activity.
2. Consensus returns `FALSE_REPORT`.
3. Nothing is cut, `cut_count` does not move, and the case stays publicly readable forever.

---

## MVP scope

**In scope:**

- One Intelligent Contract, `AgentBreaker`, in `contracts/agent_breaker.py`.
- Stage 1: fetch an agent journal over HTTP, reduce it to a **stable-field digest** inside the
  nondet block, with no model involved.
- Stage 2: `run_nondet_unsafe` over a **three-value enum only**.
- Stage 3: retain verdict, rationale, digest, window and provenance; all publicly readable.
- Custodied GEN: `deposit`, `set_agent`, `draw`, `refund`, `allowance_remaining`.
- Auto-expiry enforced in the read path, plus an explicit `reap_expired`.
- A hermetic test suite with no network access.

**Explicitly out of scope** *(the main defence against scope creep under deadline pressure)*:

- Scraping or integrating any real agent runtime. The journal is a document the agent
  publishes; nothing here runs an agent.
- Multi-agent coordination, agent swarms, or inter-agent settlement.
- Slashing, forfeiture, or reputation scoring. **A confirmed verdict never destroys money.**
  It only pauses access to it. This is a design invariant, not a missing feature.
- Appeals or counter-cases. There is no un-freeze path, by design.
- Cross-chain settlement, VRF, oracles, price feeds.
- A write-enabled frontend: wallet connection, filing or drawing from a page. Judged by stewards
  on novelty/complexity/impact, not on demo polish; one week is not enough to do both well. A
  read-only status viewer (`viewer/`) was added after the live run as a read surface; it holds no
  keys and adds nothing the contract does not already expose.
- Authentication, accounts, rate limiting on public endpoints.
- Multiple agents per contract.

**Deferred unless time allows**, in value-per-hour order:

1. A `countersign`/`attest` path letting the agent acknowledge the journal digest.
2. Per-tool-kind breakdown in the digest so validators can distinguish a benign retry loop
   from an injection-driven fan-out.

---

## System architecture

- **Runtime**: Python 3.12, `genlayer` SDK (Intelligent Contract runtime), GenVM `v0.3.0-rc7`.
- **Frontend**: read-only status viewer (`viewer/`, static, no build step); no write UI (see out of scope).
- **Backend / services**: none. The contract is the whole system.
- **Data layer**: GenLayer contract storage (`TreeMap`, `DynArray`).
- **Contract layer**: `AgentBreaker`, deployed to GenLayer Studionet (chain `61999`).
- **External integrations**: one HTTP GET to a journal URL the case names, from inside the
  nondet block. One model inference. Nothing else. No API key, no paid service.
- **Auth**: none. Cases are permissionless by design - the operator must not be able to
  suppress a case against their own agent.
- **Deployment target**: GenLayer Studionet via `genlayer-js`.

```
  agent ──draw()──>┐
                   ├──> [ AgentBreaker (Intelligent Contract) ]
  bystander ──open_case()──>┘            │
                                          │ stage 1 (deterministic, inside nondet)
                                          │   HTTP GET journal_url
                                          │   -> reduce_journal() -> stable digest
                                          │
                                          │ stage 2 (consensus)
                                          │   leader_fn   -> {verdict, rationale, digest}
                                          │   validator_fn -> compare ENUM ONLY
                                          │
                                          │ stage 3 (deterministic)
                                          v
                              CONFIRMED_MISBEHAVIOR
                                          │
                                          v
                          allowance_remaining() == 0 until expires_at
                                          │
                       expires_at passes, no transaction required
                                          │
                                          v
                              allowance restored automatically
```

---

## Data flow

| Step | Trigger | Call / action | Failure mode | Fallback |
| --- | --- | --- | --- | --- |
| 1 | Operator funds | `deposit()` | Under-funding | Balance is read from contract state; no oracle |
| 2 | Agent spends | `draw(amount)` | Breaker active → `UserError`; insufficient balance → `UserError` | A frozen agent simply cannot draw; the error is the safety property |
| 3 | Bystander reports | `open_case(payload_json)` | Bad JSON / missing fields | `UserError` before any nondet call |
| 4 | Leader fetch | `gl.nondet.web.get(journal_url)` | Non-200, unparseable, non-object | `digest_found=False` → prompt **must** yield `INSUFFICIENT_EVIDENCE` |
| 5 | Reduction | `reduce_journal()` | Missing fields | Every field bands to `UNKNOWN`, which is itself stable |
| 6 | Adjudication | `gl.nondet.exec_prompt(...)` | Model invents a fourth value, or returns non-JSON | Coerced to `INSUFFICIENT_EVIDENCE`; never obeyed |
| 7 | Validator gate | `run_nondet_unsafe` | Validators disagree on the enum | Round aborts, nothing is admitted, nothing is cut |
| 8 | Retention | `_record()` | - | Fully public via `get_case()` |

Steps 4 and 6 cost money (model inference) and can be rate-limited. Step 4 is a plain HTTP GET
against a URL the reporter chooses, which is why the output is constrained to three strings and
why the reduction happens *before* anything consensus-bound sees the data.

---

## Security considerations

- **Value safety**: the contract never confiscates. `deposit`/`refund` move native value;
  `draw` moves it against an allowance that only ever goes down and back up. A confirmed
  verdict cannot destroy funds. Invariant asserted by test.
- **No un-freeze path**: there is deliberately no owner/admin method that lifts a cut early.
  The owner can change *future* policy (`set_default_cut_seconds`) but cannot shorten an
  already-armed window. This is the product.
- **Permissionless reporting**: `open_case` has no access control, so the operator cannot
  suppress a case against their own agent. The cost of that choice is that anyone can spend
  model-inference budget by opening junk cases; bounded by requiring the case to reference a
  journal URL and by rate-limiting being explicitly out of scope.
- **Prompt injection**: the claim and every journal field are attacker-controlled. They are
  labelled as data inside delimiters, and the output space is a three-value enum that the
  contract validates against `VALID_VERDICTS` before use. An injection can at worst cause
  `INSUFFICIENT_EVIDENCE`. Asserted by test.
- **Anti-equivocation**: the leader and validators fetch independently. Anything that moves
  between two fetches seconds apart is dropped or banded before crossing the consensus
  boundary. Asserted by a byte-identical-digest test across deliberately differing raw inputs.
- **Time**: `datetime.now()` is never used for contract time. Chain time comes from
  `gl.message_raw["datetime"]`, identical on every node.
- **Access control**: only `set_agent`, `set_default_cut_seconds` and `refund` are owner-gated,
  and `refund` is blocked while any cut is active so a cut cannot be laundered into a refund.
- **Out of scope and stated as such**: no audit has been performed. This is a Builder Program
  contribution on testnet, not a production deployment. Do not use it with real value.

---

## Integration requirements

| Integration | Why required | Credential needed | Available? | Fallback if unavailable |
| --- | --- | --- | --- | --- |
| GenLayer Studionet | Deploy and finalise verdicts | Testnet wallet key | Yes | Local `gltest` harness |
| GenVM `v0.3.0-rc7` | Contract runtime | None (pinned bundle) | Yes (cached locally) | Pin fails loudly |
| Model provider | Adjudication inference | Hosted by GenLayer nodes | Yes | Out-of-enum coerced to `INSUFFICIENT_EVIDENCE` |
| Journal host | Agent telemetry source | None - any HTTP URL | Yes | Non-200 becomes `INSUFFICIENT_EVIDENCE` |

---

## Acceptance criteria

Checked against the suite as it stands. `[x]` means a named test enforces it and would fail if the
behaviour regressed; it does not mean a human eyeballed it once.

- [x] `pytest` passes with no network access. *(87 tests)*
- [x] The three verdicts are reachable and the suite asserts each one from recorded evidence.
- [x] A confirmed verdict drives `allowance_remaining()` to `0` **before** `expires_at`.
- [x] `allowance_remaining()` returns to its pre-case value **after** `expires_at`, with no
      write transaction in between.
- [x] There is no method anywhere in the contract that lifts a cut early.
- [x] Two journals differing only in dropped volatile fields produce a byte-identical digest.
- [x] An injected claim against benign evidence yields `FALSE_REPORT`.
- [x] An injected claim cannot escape its delimiter and be read as an instruction.
- [x] Out-of-enum model output is coerced to `INSUFFICIENT_EVIDENCE`, not obeyed.
- [x] A ledger test proves contract value is conserved across every path.
- [x] An out-of-range cut policy is rejected at deploy rather than silently defaulted.
- [x] Every timestamp spelling the node can supply collapses to one canonical form.
- [ ] `genvm-lint check` passes. **Lint rules run clean; its SDK-load validation cannot complete
      on this machine** - the `runners/py-genlayer/*.tar` bundle entries have been pruned from
      `~/.cache`. The same failure occurs on known-good reference contracts, so it is
      environmental. The 87-test suite runs the contract against a real GenVM bundle and is the
      stronger check.
- [x] Deployed to Studionet and at least one case finalised live. No funded key was needed -
      Studionet is zero-fee. Contract `0x7Ee18844C80395E23f06Cf75D2B998723E36804f`; live case
      `0x2e466d7a…f760014` reached `CONFIRMED_MISBEHAVIOR` under real validator LLMs and the cut
      lifted by clock alone. The funded value loop was not exercised live; see
      [`SUBMISSION.md`](SUBMISSION.md) §6.
- [ ] README setup steps verified on a clean environment.

Two criteria above are weaker than they look and are called out rather than hidden:

- *"An injected claim against benign evidence yields `FALSE_REPORT`"* is proven against a
  deterministic stand-in model, so it shows the verdict follows the measured bands. It does not
  show that a real model resists injection. The prompt-framing property is pinned separately, by
  `test_the_allegation_cannot_close_its_own_delimiter`.
- *"Every timestamp spelling the node can supply collapses to one canonical form"* is a fix, not a
  given. The previous normaliser returned a `+00:00` form untouched, which made a lexicographic
  comparison invert at the expiry second. See CONSENSUS.md §10.
