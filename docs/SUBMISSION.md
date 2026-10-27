# Submission package - GenLayer incentivized Builder Program

Everything the GenLayer portal (https://portal.genlayer.foundation/, redirected from
points.genlayer.com) asks for, in the order it is asked for. Steward-reviewed on three
words - **novelty, complexity, impact** - with an 18.5% acceptance rate, so the job is to make
the argument easy to check rather than to argue it hard.

Current status is honest and marked: **v3 is deployed to Studionet and exercised live.** The
evidence-authentication finding is covered by live evidence - an unsigned journal is rejected
before any model call, the agent's spending key cannot self-attest, and a journal signed by the
separate observer about another agent is rejected before the model, and a replay under a new case
id is rejected by the case binding. The settlement finding is covered by the hermetic
custody/settlement tests and remains unfunded live. See §3 and §6.

---

## 1. Contribution description

Paste this into the contribution form. It is under 150 words on purpose.

> **Furlough** adjudicates an autonomous AI agent's telemetry and, on a CONFIRMED_MISBEHAVIOR
> verdict, cuts the agent's custodied GEN allowance to zero until a deadline that expires
> on its own.
>
> The cut is performed by validator consensus and lifted by a clock - never by a human. Anyone
> may open a case, so the operator cannot suppress a report against its own agent. The submitted
> journal must be signed by the bound observer over this contract, chain, case, claim, URL,
> subject agent and observer, plus the journal bytes; the envelope must also name the bound
> agent. Unsigned, foreign or replayed evidence is rejected before a model call. A confirmed
> verdict suspends access; it never destroys funds.
>
> Validators independently re-fetch and re-authenticate, reduce the journal to a banded,
> identifier-free digest, and compare only a three-value enum - never free-text rationale.
>
> Deployed to Studionet (`0xf6434915c52fF21C74d3aDb1CeA9AE68DB8e8Eb0`) with 122 hermetic tests.
> A signed case reached CONFIRMED_MISBEHAVIOR, an unsigned copy INSUFFICIENT_EVIDENCE, a signed
> benign case FALSE_REPORT, and a signed journal naming another agent INSUFFICIENT_EVIDENCE.

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
| Primary tag | **AI & Agents** (the closest second is Dispute Resolution, but the product is agent infrastructure) |
| Specific focus | Pick the two closest topics the portal offers under **AI & Agents** - **agent infrastructure / custody** first, **AI safety or governance** second. |
| Website | https://furlough-dt8b.vercel.app/ |
| GitHub | https://github.com/vincentofweb3/furlough |
| X / Discord / Telegram | Only if a project account exists; leave blank rather than invent one |
| Deployment | `https://explorer-studio.genlayer.com/address/0xf6434915c52fF21C74d3aDb1CeA9AE68DB8e8Eb0` - Studio, the network the contract is on |
| How to test | See "How-to path" below - five walletless steps |
| Expected verification outcome | See the exact copy below the steps |
| Evidence | Contract page above; deploy tx https://explorer-studio.genlayer.com/tx/0x9156b52a3794d7d133307f6aa9225aa0b4a6cae4d3cdd73b67ae8c191addad17; signed case https://explorer-studio.genlayer.com/tx/0x1b1ee7baf91def4cfdd6f6cabc63f05dba32242e73ef12e59d7bade8a50916df; unsigned case https://explorer-studio.genlayer.com/tx/0xd9f6f7c6353b21b2e6fcd4c634ca39d30edea649e17942f8f4030634aab8d27f; benign case https://explorer-studio.genlayer.com/tx/0xc591d813602c7d9c524f2d6854e05f258418ab43b34c15041fb8581250ede04a; foreign-agent case https://explorer-studio.genlayer.com/tx/0xdf4b907b87260262aa2e718464e62afe527a3d14104f552f6b1bb3c3f1b4c4e7; replay case https://explorer-studio.genlayer.com/tx/0x98cfab02967ffce30d853cd3857faf124baefab3b1e943c5b537ee6df79fc03e; https://github.com/vincentofweb3/furlough#readme; https://github.com/vincentofweb3/furlough/blob/master/references/traceability.md |
| Demo video | Not present. The portal's `Demo URL (YouTube or X) · required` field is labelled **Agent Tank hackathon**, whose build window closed 17 September 2026. If the live form asks for a demo URL, that is an Agent Tank submission, not this Builder project package - stop and flag it. |

### How-to path

Use these five steps in the portal's **How-to** section.

| # | Optional heading | Instruction |
| --- | --- | --- |
| 01 | Open the live board | Go to https://furlough-dt8b.vercel.app/live/. No wallet is needed. Wait for the status to load and confirm `OPERATING`, network `Studionet - chain 61999`, `default cut window 900s`, and 5 cases on record. |
| 02 | Read the signed case | Find `live-v3-auth-1`. Confirm verdict `CONFIRMED_MISBEHAVIOR`, `authenticated=True`, `agent_matches=True`, cut armed `2026-10-23T09:01:53Z`, expires `2026-10-23T09:16:53Z`, and the line "lifted by the clock, no transaction". |
| 03 | Verify the transactions | Open https://furlough-dt8b.vercel.app/verify/. Open `live-v3-auth-1` tx `0x1b1ee7baf91def4cfdd6f6cabc63f05dba32242e73ef12e59d7bade8a50916df` and confirm `FINALIZED` / `CONFIRMED_MISBEHAVIOR`. Open `live-v3-unsigned-1` tx `0xd9f6f7c6353b21b2e6fcd4c634ca39d30edea649e17942f8f4030634aab8d27f`; confirm `FINALIZED` / `INSUFFICIENT_EVIDENCE`. Open `live-v3-foreign-1` tx `0xdf4b907b87260262aa2e718464e62afe527a3d14104f552f6b1bb3c3f1b4c4e7`; confirm `FINALIZED` / `INSUFFICIENT_EVIDENCE` with `authenticated=True` and `agent_matches=False`. Open `live-v3-auth-2` tx `0x98cfab02967ffce30d853cd3857faf124baefab3b1e943c5b537ee6df79fc03e`; confirm `FINALIZED` / `INSUFFICIENT_EVIDENCE` - the auth-1 envelope replayed under a different case id. |
| 04 | Confirm there was no unlock | On the same `/verify/` page, scroll to the cut table. Confirm `live-v3-auth-1` lists `0` unlock txs and "by the clock", armed `09:01:53Z`, deadline `09:16:53Z`, lifted `09:16:53Z`. The unsigned, foreign-agent and replay cases have no cut at all. |
| 05 | Run the tests | Clone https://github.com/vincentofweb3/furlough and run `python3.12 scripts/check_env.py --fetch` once, then `python3.12 -m pytest -q`. Expect `122 passed`, with no network and no API key during the suite. |

**Expected verification outcome - copy this:**

> Existing Studionet deployment, not newly generated. The path shows a working breaker: `OPERATING` on chain 61999, 5 cases filed, 900s default. `live-v3-auth-1` is observer-signed and names the bound agent, `CONFIRMED_MISBEHAVIOR`, and its cut lifted at `2026-10-23T09:16:53Z` by the clock. `live-v3-unsigned-1` is the same journal bytes without a signature and is `INSUFFICIENT_EVIDENCE` - no model, no cut. `live-v3-benign-1` is signed and `FALSE_REPORT`. `live-v3-foreign-1` is observer-signed but names another agent: `INSUFFICIENT_EVIDENCE`, no model, no cut. `live-v3-auth-2` replayed the auth-1 envelope under a new case id and was rejected by the case binding. The cut table shows 0 unlock txs; tests pass 122/122. Contract: `0xf6434915c52fF21C74d3aDb1CeA9AE68DB8e8Eb0`. Read-only: no wallet or gas.

**Form honesty note:** use §4 for the limits. Do not imply the funded value loop ran live; it did
not. The four evidence cases were filed through the CLI. A fifth replay case was filed from an
external wallet, but the report console's browser flow was not independently verified in this
review. The SDK write path was validated by one owner-policy transaction on the previous
deployment.

---

## 2. Repository

- [x] Public - committed and pushed to `github.com/vincentofweb3/furlough`
- [x] `README.md` states the problem, the mechanism and the honest limits in the first screen
- [x] `LICENSE` present (MIT)
- [x] CI badge green for v3 - `.github/workflows/tests.yml` and `pages.yml` passed on the v3 push
      (`9f44927`); the 122-test local run matches CI
- [x] `docs/CONSENSUS.md` - the safety argument, written to be disputed, every claim mapped to a test
- [x] `references/traceability.md` - criterion → feature → code → test → demo moment
- [x] `docs/PLAN.md` - what is done, what is blocked, what is deliberately not done
- [x] `scripts/live_check.py`, `scripts/sign_journal.py` and `viewer/` - walletless live status,
      signed-envelope helper, and wallet-signed report and owner consoles, deployed on Vercel and
      mirrored on GitHub Pages

**Why a reviewer can trust the test table:** during review, four claims in the safety argument
were checked by *deleting the behaviour and confirming a test failed*. Three of the four had not
been caught. Those were fixed, and `docs/PLAN.md` §"Why the review in Stage 7b mattered" records it. That is a
stronger signal than a large green suite, because it shows the suite was tested.

---

## 3. Demo scenario

Six minutes. The last two are the product; do not rush them.

| # | Do | Say | Proves |
| --- | --- | --- | --- |
| 1 | Open the status board, then show the constructor args and `stats()` | "one agent, one observer, one custodian, one cut window" | Reusable primitive |
| 2 | Show the settlement tests, or a funded local run - not the unfunded live deployment | "transfers are atomic; a failed child is repaired by callback or `reconcile()`" | Value safety |
| 3 | Publish an observer-signed journal naming the agent; open a case **from the report console** | "anyone may report, but only the bound observer's signed bytes about this agent can cut" | Authentication + permissionlessness |
| 4 | Show `get_case()` - verdict, rationale, digest, window, `authenticated` | "the model wrote a rationale nobody compared; only the enum was agreed" | Consensus design |
| 5 | `is_cut() == true`, `allowance_remaining() == 0` | "nobody did this. validators did" | N1 |
| 6 | **Wait out the window. Read only.** No transaction. | "…and nobody undid it. the clock did" | **N3 - the whole product** |

Then, if time: show the unsigned copy of the same journal - `INSUFFICIENT_EVIDENCE`, no cut -
the foreign-agent journal - authenticated but `agent_matches=False` - and a signed benign journal
- `FALSE_REPORT`, cut untouched. A breaker that fires on everything, on an anonymous document,
or on a different agent is not a breaker.

**Screenshots:** `docs/screenshots/viewer-v3-live.png` captures the local v3 build reading the
live contract: `OPERATING`, 5 case filings, and the `live-v3-auth-1` window lifted by the clock.
`docs/screenshots/viewer-v3-verify.png` captures the deployment, all six finalized transactions,
the cut table and the 122-test count. An active `CUT ACTIVE` frame is still pending because the
window expired before capture; the two `archive-v1-*.png` files are historical and must not be
presented as v3 evidence. Capture against the deployed v3 viewer once Vercel is refreshed.

---

## 4. Honest limits - put these in the form too

A reviewer who finds an unclaimed hole discounts everything else. These are already in
`README.md` and `CONSENSUS.md` §11; repeating them in the submission costs nothing.

- **Not audited.** Testnet contribution. Do not use with real value.
- **Authenticated is not truthful.** The contract proves the bound observer's key signed this
  exact contract, chain, case, claim, URL, subject agent and journal bytes. A compromised
  observer key can still sign false telemetry, and an observer controlled by the agent's operator
  is not organisationally independent; a distinct agent spending key cannot sign evidence, but
  the owner can reassign the agent role (including to the observer). Authentication raises the
  bar; it is not an oracle.
- **The hermetic gate does not prove two real models agree.** The test model is a deterministic
  stand-in keyed on the measured bands. Five live case filings have finalized, which exercises the live
  path; that is not proof that independent models agree.
- **Bands are hand-calibrated** against fixtures, not derived from observed agent traffic.
- **The live run had no money in it.** The v3 deployment has `deposited == 0`, so deposit, draw,
  refund and recovery were not demonstrated with real GEN. They are covered by the custody and
  settlement tests and disclosed here rather than implied.
- **A signed journal can still spend model budget.** There is no bond or rate limit on
  `open_case`; weak evidence should end at `INSUFFICIENT_EVIDENCE`, and a compromised observer
  key can sign a false loop. Missing or unreachable journals fail open.
- **The consoles are a convenience, not part of the safety argument.** The board renders public
  reads. The report console calls `open_case`; the owner console changes future policy. Neither
  holds a key, and neither can lift a cut. The v3 report path has not yet been exercised through
  a browser wallet.
- **Single agent per contract.** Multi-agent and swarms are out of scope by decision.

---

## 5. Why this scores on the three words

No weights are invented here; the program publishes none.

- **Novelty** - no on-chain circuit breaker exists for AI agents where no human performs the
  action. The self-expiry is the part that is hard to copy: `allowance_remaining()` reads a
  clock, so the recovery path contains no method at all.
- **Complexity** - independent-fetch consensus with an anti-equivocation reduction, secp256k1
  authentication bound to contract, chain, case, claim, URL, subject agent, observer and journal
  bytes, and custodied value accounting with atomic settlement and recovery. Three properties that are easy to state and easy to get wrong: only the enum crosses
  the boundary, a journal that merely *grew* must reduce byte-identically, and a failed transfer
  may not silently change the allowance.
- **Impact** - AI & Agents. A deployed primitive for agent custody, and the contract earns dev
  fees on the points it generates.

---

## 6. Blockers before submission

| # | Blocker | State |
| --- | --- | --- |
| 1 | Deploy v3 | **done** - contract `0xf6434915c52fF21C74d3aDb1CeA9AE68DB8e8Eb0`, tx `0x9156b52a…addad17`, FINALIZED. No faucet needed: Studionet is zero-fee |
| 2 | Authenticated live case under real validator LLMs | **done** - `live-v3-auth-1` tx `0x1b1ee7ba…0916df`, FINALIZED, `CONFIRMED_MISBEHAVIOR`, `authenticated=True` |
| 3 | Unsigned copy rejected | **done** - `live-v3-unsigned-1` tx `0xd9f6f7c6…b8d27f`, FINALIZED, `INSUFFICIENT_EVIDENCE`, `authenticated=False`, no cut |
| 4 | Signed benign case | **done** - `live-v3-benign-1` tx `0xc591d813…0ede04a`, FINALIZED, `FALSE_REPORT`, no cut |
| 5 | Foreign-agent journal rejected | **done** - `live-v3-foreign-1` tx `0xdf4b907b…b4c4e7`, FINALIZED, `INSUFFICIENT_EVIDENCE`, `authenticated=True`, `agent_matches=False`, no model |
| 6 | Confirm the cut lifts by itself, no transaction | **done** - armed `2026-10-23T09:01:53Z`, expired `09:16:53Z`; a public read after expiry returned `cut_active=false` / `cut none` with no transaction |
| 7 | Deposit GEN so the allowance is visibly cut and restored | **skipped by decision** - the live cases ran against a zero allowance and this is not claimed. Accounting, atomic settlement and recovery are proven by tests |
| 8 | Fresh v3 screenshots | **partial** - v3 `OPERATING`/verify screenshots captured from the viewer reading live state; active-cut/expiry frame remains pending |
| 9 | Commits pushed, repo public | **done** - v3 commit `9f44927` is on `origin/master`; tests and pages workflows passed |
| 10 | Vercel/Pages serve the v3 viewer | **done** - Vercel and GitHub Pages serve the v3 build; re-check after this replay-case update |
| 11 | Replay under a new case id rejected | **done** - `live-v3-auth-2` tx `0x98cfab02…f79fc03e`, FINALIZED, `INSUFFICIENT_EVIDENCE`, no cut |
| 12 | GitHub OAuth verification on portal.genlayer.com | human |
| 13 | Submission logo | **done** - `viewer/public/logo.png`, 1024x1024 RGBA PNG, 24 KB; inside the portal's 128-2048 px and 2 MB limits |

**Before submitting:** verify OAuth, open every link in the form, and check the live board renders
after the v3 viewer deploy and after Studionet's next reset. Item 7 stays skipped and is stated
plainly rather than implied away; the live records above are the claim, and a link that 404s is
worse than no link.

Asimov is not a fallback: its per-transaction gas cap is 2^24, and this contract's source is about
53 KB - well over the cap. The 5 GEN sent to the deployer on Asimov cannot deploy it.

Studionet resets periodically. If the deployed address disappears, re-deploy; do not debug it.
