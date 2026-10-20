# Submission package — GenLayer incentivized Builder Program

Everything points.genlayer.com asks for, in the order it is asked for. Steward-reviewed on three
words — **novelty, complexity, impact** — with an 18.5% acceptance rate, so the job is to make
the argument easy to check rather than to argue it hard.

Current status is honest and marked: **deployed to Studionet and exercised live** — one real case
reached `CONFIRMED_MISBEHAVIOR` under validator LLMs. See §3 and §6.

---

## 1. Contribution description

Paste this into the contribution form. It is 120 words on purpose.

> **Furlough** is a GenLayer Intelligent Contract that adjudicates an autonomous AI agent's own
> published telemetry and, on a `CONFIRMED_MISBEHAVIOR` verdict, cuts the agent's custodied GEN
> spend allowance to zero until a deadline that expires on its own.
>
> The cut is performed by validator consensus, never by a human. The cut is lifted by a clock,
> never by a human. Anyone may open a case, so the operator cannot suppress a report against its
> own agent. A confirmed verdict suspends access to funds and never destroys them.
>
> The hard part is not asking a model a question. It is getting validators to *agree* on that
> answer while independently re-fetching a document that is still changing: the leader's journal
> is reduced to a banded, identifier-free digest before anything crosses the consensus boundary,
> and only a three-value enum is compared — never free-text rationale, which two models will
> never match.
>
> Deployed to Studionet (`0x7Ee18844C80395E23f06Cf75D2B998723E36804f`); one contract, 87
> hermetic tests, no API keys, no frontend. One live case reached `CONFIRMED_MISBEHAVIOR` under
> real validator LLMs and armed a 900-second cut.

---

## 2. Repository

- [ ] Public (currently local, no commits — see §6)
- [ ] `README.md` states the problem, the mechanism and the honest limits in the first screen
- [ ] `LICENSE` present (MIT)
- [ ] CI badge green — `.github/workflows/tests.yml`, one command, no network needed
- [ ] `docs/CONSENSUS.md` — the safety argument, written to be disputed, every claim mapped to a test
- [ ] `references/traceability.md` — criterion → feature → code → test → demo moment
- [ ] `docs/PLAN.md` — what is done, what is blocked, what is deliberately not done

**Why a reviewer can trust the test table:** during review, four claims in the safety argument
were checked by *deleting the behaviour and confirming a test failed*. Three of the four had not
been caught. Those were fixed, and `docs/PLAN.md` §"Why the review mattered" records it. That is a
stronger signal than a large green suite, because it shows the suite was tested.

---

## 3. Demo scenario

Six minutes. The last two are the product; do not rush them.

| # | Do | Say | Proves |
| --- | --- | --- | --- |
| 1 | Show the constructor args and `stats()` | "one agent, one custodian, one cut window" | Reusable primitive |
| 2 | `deposit()` 5000 GEN, then `draw()` | "real GEN, allowance-gated" | Custody works |
| 3 | Publish a runaway journal; open a case **from a non-owner address** | "anyone may report — the operator cannot suppress this" | Permissionlessness |
| 4 | Show `get_case()` — verdict, rationale, digest, window | "the model wrote a rationale nobody compared; only the enum was agreed" | Consensus design |
| 5 | `is_cut() == true`, `allowance_remaining() == 0` | "nobody did this. validators did" | N1 |
| 6 | **Wait out the window. Read only.** No transaction. | "…and nobody undid it. the clock did" | **N3 — the whole product** |

Then, if time: open a *benign* case and show the verdict is `FALSE_REPORT` and the cut is
untouched — a breaker that fires on everything is not a breaker.

**Capture as screenshots:** step 5 (`is_cut() == true`, `allowance_remaining() == 0`) and step 6
(the same two reads after expiry, with the intervening block visibly empty of transactions).
Those two images are the submission.

---

## 4. Honest limits — put these in the form too

A reviewer who finds an unclaimed hole discounts everything else. These are already in
`README.md` and `CONSENSUS.md` §11; repeating them in the submission costs nothing.

- **Not audited.** Testnet contribution. Do not use with real value.
- **The journal is unauthenticated.** Anyone can publish a journal naming the bound agent's
  address and describe a retry loop. The address is public. Agent-signed digest commitment is the
  obvious fix and the first thing to build next.
- **The hermetic gate does not prove two real models agree.** The test model is a deterministic
  stand-in keyed on the measured bands. Real inter-model agreement needs the live deploy.
- **Bands are hand-calibrated** against fixtures, not derived from observed agent traffic.
- **`_settle` is a traced no-op** on SDK `v0.3.0-rc7`. Accounting is exact; GEN movement is
  best-effort.
- **The live run had no money in it.** The live case ran with `deposited == 0`, so the cut's
  value effect — allowance `deposited → 0 → deposited` — was not demonstrated on-chain. That
  path is covered only by the hermetic custody tests.
- **Single agent per contract.** Multi-agent and swarms are out of scope by decision.

---

## 5. Why this scores on the three words

No weights are invented here; the program publishes none.

- **Novelty** — no on-chain circuit breaker exists for AI agents where no human performs the
  action. The self-expiry is the part that is hard to copy: `allowance_remaining()` reads a
  clock, so the recovery path contains no method at all.
- **Complexity** — independent-fetch consensus with an anti-equivocation reduction, plus
  custodied value accounting. Two properties that are easy to state and easy to get wrong: only
  the enum crosses the boundary, and a journal that merely *grew* must reduce byte-identically.
- **Impact** — Tools & Infrastructure. A deployed primitive, and the contract earns dev fees on
  the points it generates.

---

## 6. Blockers before submission

| # | Blocker | State |
| --- | --- | --- |
| 1 | Deploy | **done** — contract `0x7Ee18844C80395E23f06Cf75D2B998723E36804f`, tx `0x20711178…5cb905`, FINALIZED. No faucet needed: Studionet is zero-fee |
| 2 | Live case under real validator LLMs | **done** — `CONFIRMED_MISBEHAVIOR`, cut armed, tx `0x2e466d7a…f760014`, FINALIZED in 53s |
| 3 | Confirm the cut lifts by itself after 900s, no transaction | **done** — at `2026-10-20T18:34:07Z`, `is_cut()` false and `seconds_remaining()` 0, no transaction between |
| 4 | Deposit GEN so the allowance is visibly cut and restored | **skipped by decision** — the live case ran against a zero allowance and this is not claimed. The custody accounting is proven by the hermetic deposit/draw/refund conservation tests |
| 5 | Screenshots of the cut and of the no-transaction lift | after 3 |
| 6 | First commit, then push, then make public | needs your approval |
| 7 | GitHub OAuth verification on points.genlayer.com | human |

**Do not submit before 3 and 5.** The submission's central claim can only be demonstrated live,
and a submission without it is asking a steward to take it on trust — precisely what this project
exists to replace. If 4 is not done, say so rather than implying the live run had funds in it.

Asimov is not a fallback: its per-transaction gas cap is 2^24, and this source needs 33.2M gas
there. The 5 GEN sent to the deployer on Asimov cannot deploy this contract.

Studionet resets periodically. If the deployed address disappears, re-deploy; do not debug it.