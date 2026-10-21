# Submission package - GenLayer incentivized Builder Program

Everything the GenLayer portal (https://portal.genlayer.foundation/, redirected from
points.genlayer.com) asks for, in the order it is asked for. Steward-reviewed on three
words - **novelty, complexity, impact** - with an 18.5% acceptance rate, so the job is to make
the argument easy to check rather than to argue it hard.

Current status is honest and marked: **deployed to Studionet and exercised live** - three real
cases reached `CONFIRMED_MISBEHAVIOR` under validator LLMs. See §3 and §6.

---

## 1. Contribution description

Paste this into the contribution form. It is just under 150 words on purpose.

> **Furlough** adjudicates an autonomous AI agent's own published telemetry and, on a
> `CONFIRMED_MISBEHAVIOR` verdict, cuts the agent's custodied GEN spend allowance to zero until
> a deadline that expires on its own.
>
> The cut is performed by validator consensus and lifted by a clock - never by a human. Anyone
> may open a case, so the operator cannot suppress a report against its own agent. A confirmed
> verdict suspends access to funds; it never destroys them.
>
> Validators must agree while independently re-fetching a document that is still changing: the
> journal is reduced to a banded, identifier-free digest before anything crosses the consensus
> boundary, and only a three-value enum is compared - never free-text rationale, which two
> models will never write identically.
>
> Deployed to Studionet (`0x7Ee18844C80395E23f06Cf75D2B998723E36804f`) with 87 hermetic tests
> and a live status board with wallet consoles. Three live cases reached
> `CONFIRMED_MISBEHAVIOR`; every cut lifted itself.

---

## 1b. Portal project-application fields

The current portal project page asks for more than the free-text contribution. These are the
copy-ready values. The exact field list is only visible after wallet login - confirm labels in the
live form.

| Field | Value |
| --- | --- |
| Project name | **Furlough** |
| One-liner | An adjudicated circuit breaker for autonomous AI agents: consensus cuts the spend allowance, and a clock restores it. |
| Description | §1 above - under 150 words, covers the problem, mechanism and live evidence |
| Logo | `viewer/public/logo.png` - 1024x1024 RGBA PNG, 24 KB (portal accepts PNG/JPEG/WebP, 128-2048 px, max 2 MB) |
| Primary tag | **Tools & Infrastructure** (or the closest infrastructure tag the portal offers) |
| Specific focus | Pick the two closest topics the portal offers under that tag - **agent infrastructure** first, **AI governance / adjudication** second. The mechanism sits at the intersection. |
| Website | https://furlough-dt8b.vercel.app/ |
| GitHub | https://github.com/vincentofweb3/furlough |
| X / Discord / Telegram | Only if a project account exists; leave blank rather than invent one |
| Deployment | `https://explorer-studio.genlayer.com/address/0x7Ee18844C80395E23f06Cf75D2B998723E36804f` - Studio, the network the contract is on |
| How to test | 1) Open the status board and confirm `OPERATING`, 3 cases, 900s default. 2) `python3.12 scripts/check_env.py && python3.12 -m pytest -q` -> `87 passed`. 3) `python3.12 scripts/live_check.py status` -> live contract, three `CONFIRMED_MISBEHAVIOR` cases, every window expired. 4) Open `/verify/` for tx-by-tx evidence and `/report/` for the console. 5) Read the contract on Studio Explorer; no transaction lifted any cut. |
| Expected verification outcome | The contract reads `OPERATING` with three `CONFIRMED_MISBEHAVIOR` cases; every cut lifted at its deadline with no transaction; the hermetic suite is `87 passed`; live reads need no wallet. |
| Evidence | Contract page above; deploy tx https://explorer-studio.genlayer.com/tx/0x2071117864281aa6c66906ecc90f914d69917b9590c1149653ca54e14f5cb905; live txs https://explorer-studio.genlayer.com/tx/0x2e466d7a8e0d17380a7ba29ffdfb12a6ff2fec90df5ecd1c6bff2eef5f760014, https://explorer-studio.genlayer.com/tx/0x7dda175bfadf3226fbf6de9c9326fb339e19f51aa256a756cfae77f2a2a0887b, https://explorer-studio.genlayer.com/tx/0x28f69b61edd599ade8ecacae61dcdfb92b005a542ea8e36f154f2eb58c259379; https://github.com/vincentofweb3/furlough#readme; https://github.com/vincentofweb3/furlough/blob/master/references/traceability.md |
| Demo video | Not present. The portal's `Demo URL (YouTube or X) · required` field is labelled **Agent Tank hackathon**, whose build window closed 17 September 2026. If the live form asks for a demo URL, that is an Agent Tank submission, not this Builder project package - stop and flag it. |

**Form honesty note:** use §4 for the limits. Do not imply the funded value loop ran live or that
a case was filed through MetaMask; neither happened. The three live cases were filed through the
CLI, and the SDK write validates encoding and finality, not browser-wallet UX.

---

## 2. Repository

- [x] Public - committed and pushed to `github.com/vincentofweb3/furlough`
- [x] `README.md` states the problem, the mechanism and the honest limits in the first screen
- [x] `LICENSE` present (MIT)
- [x] CI badge green - `.github/workflows/tests.yml`, one command, no network needed
- [x] `docs/CONSENSUS.md` - the safety argument, written to be disputed, every claim mapped to a test
- [x] `references/traceability.md` - criterion → feature → code → test → demo moment
- [x] `docs/PLAN.md` - what is done, what is blocked, what is deliberately not done
- [x] `scripts/live_check.py` and `viewer/` - walletless live status plus wallet-signed report and
      owner consoles, deployed on Vercel and mirrored on GitHub Pages

**Why a reviewer can trust the test table:** during review, four claims in the safety argument
were checked by *deleting the behaviour and confirming a test failed*. Three of the four had not
been caught. Those were fixed, and `docs/PLAN.md` §"Why the review mattered" records it. That is a
stronger signal than a large green suite, because it shows the suite was tested.

---

## 3. Demo scenario

Six minutes. The last two are the product; do not rush them.

| # | Do | Say | Proves |
| --- | --- | --- | --- |
| 1 | Open the status board, then show the constructor args and `stats()` | "one agent, one custodian, one cut window" | Reusable primitive |
| 2 | `deposit()` 5000 GEN, then `draw()` | "real GEN, allowance-gated" | Custody works |
| 3 | Publish a runaway journal; open a case **from the report console** | "anyone may report - the operator cannot suppress this" | Permissionlessness |
| 4 | Show `get_case()` - verdict, rationale, digest, window | "the model wrote a rationale nobody compared; only the enum was agreed" | Consensus design |
| 5 | `is_cut() == true`, `allowance_remaining() == 0` | "nobody did this. validators did" | N1 |
| 6 | **Wait out the window. Read only.** No transaction. | "…and nobody undid it. the clock did" | **N3 - the whole product** |

Then, if time: open a *benign* case and show the verdict is `FALSE_REPORT` and the cut is
untouched - a breaker that fires on everything is not a breaker.

**Capture as screenshots:** the status board in `CUT ACTIVE` and the same board after expiry
(`lifted by the clock`, no transaction). Both live in `docs/screenshots/`, embedded in the README,
and reproduce from https://furlough-dt8b.vercel.app/ or `python3.12 scripts/live_check.py status`.

---

## 4. Honest limits - put these in the form too

A reviewer who finds an unclaimed hole discounts everything else. These are already in
`README.md` and `CONSENSUS.md` §11; repeating them in the submission costs nothing.

- **Not audited.** Testnet contribution. Do not use with real value.
- **The journal is unauthenticated.** Anyone can publish a journal naming the bound agent's
  address and describe a retry loop. The address is public. Agent-signed digest commitment is the
  obvious fix and the first thing to build next.
- **The hermetic gate does not prove two real models agree.** The test model is a deterministic
  stand-in keyed on the measured bands. Three live cases have finalized, which exercises the live
  path; that is not proof that independent models agree.
- **Bands are hand-calibrated** against fixtures, not derived from observed agent traffic.
- **`_settle` is a traced no-op** on SDK `v0.3.0-rc7`. Accounting is exact; GEN movement is
  best-effort.
- **The live run had no money in it.** The live case ran with `deposited == 0`, so the cut's
  value effect - allowance `deposited → 0 → deposited` - was not demonstrated on-chain. That
  path is covered only by the hermetic custody tests.
- **The consoles are a convenience, not part of the safety argument.** The board renders public
  reads. The report console calls `open_case`; the owner console changes future policy. Neither
  holds a key, and neither can lift a cut. The write path is validated by one owner policy
  transaction signed with a local testnet key, not yet by a case filed through MetaMask; the
  browser console is newly built.
- **Single agent per contract.** Multi-agent and swarms are out of scope by decision.

---

## 5. Why this scores on the three words

No weights are invented here; the program publishes none.

- **Novelty** - no on-chain circuit breaker exists for AI agents where no human performs the
  action. The self-expiry is the part that is hard to copy: `allowance_remaining()` reads a
  clock, so the recovery path contains no method at all.
- **Complexity** - independent-fetch consensus with an anti-equivocation reduction, plus
  custodied value accounting. Two properties that are easy to state and easy to get wrong: only
  the enum crosses the boundary, and a journal that merely *grew* must reduce byte-identically.
- **Impact** - Tools & Infrastructure. A deployed primitive, and the contract earns dev fees on
  the points it generates.

---

## 6. Blockers before submission

| # | Blocker | State |
| --- | --- | --- |
| 1 | Deploy | **done** - contract `0x7Ee18844C80395E23f06Cf75D2B998723E36804f`, tx `0x20711178…5cb905`, FINALIZED. No faucet needed: Studionet is zero-fee |
| 2 | Live case under real validator LLMs | **done three times** - `CONFIRMED_MISBEHAVIOR`; `live-runaway` tx `0x2e466d7a…f760014` (FINALIZED in 53s), `cli-check-1` tx `0x7dda175b…a0887b`, and `ui-check-1` tx `0x28f69b61…259379`, each filed through the CLI |
| 3 | Confirm the cut lifts by itself, no transaction | **done three times** - `2026-10-20T18:34:07Z` for `live-runaway`, `2026-10-20T21:54:21Z` for `cli-check-1`, `2026-10-20T23:21:01Z` for `ui-check-1`; `is_cut()` false, `seconds_remaining()` 0, no transaction in between any of them |
| 4 | Deposit GEN so the allowance is visibly cut and restored | **skipped by decision** - the live case ran against a zero allowance and this is not claimed. The custody accounting is proven by the hermetic deposit/draw/refund conservation tests |
| 5 | Screenshots of the cut and of the no-transaction lift | **done** - `docs/screenshots/viewer-cut-active.png` and `viewer-lifted.png`, captured from the multi-page board against `ui-check-1`, embedded in the README |
| 6 | Commits pushed, repo public | **done** - all commits are on `origin/master`; the repository is public |
| 7 | GitHub OAuth verification on portal.genlayer.com | human |
| 8 | Pages for the site | **done** - Pages enabled with `build_type=workflow`; the `pages` workflow serves the mirror at https://vincentofweb3.github.io/furlough/ |
| 9 | Vercel deploy as the primary host | **done** - https://furlough-dt8b.vercel.app/ is live; root directory `viewer/`, framework auto-detect (Next.js), auto-deploys from `master` |
| 10 | Submission logo | **done** - `viewer/public/logo.png`, 1024x1024 RGBA PNG, 24 KB; inside the portal's 128-2048 px and 2 MB limits |

**Before submitting:** verify OAuth, open every link in the form, and check the live board renders
after Studionet's next reset. Item 4 stays skipped and is stated plainly rather than implied away;
the live records above are the claim, and a link that 404s is worse than no link.

Asimov is not a fallback: its per-transaction gas cap is 2^24, and this source needs 33.2M gas
there. The 5 GEN sent to the deployer on Asimov cannot deploy this contract.

Studionet resets periodically. If the deployed address disappears, re-deploy; do not debug it.