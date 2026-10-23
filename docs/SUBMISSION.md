# Submission package - GenLayer incentivized Builder Program

Everything the GenLayer portal (https://portal.genlayer.foundation/, redirected from
points.genlayer.com) asks for, in the order it is asked for. Steward-reviewed on three
words - **novelty, complexity, impact** - with an 18.5% acceptance rate, so the job is to make
the argument easy to check rather than to argue it hard.

Current status is honest and marked: **v2 is deployed to Studionet and exercised live.** The two
rejection findings are now covered by live evidence - an unsigned journal is rejected before any
model call, and a signed journal still cuts. See §3 and §6.

---

## 1. Contribution description

Paste this into the contribution form. It is under 150 words on purpose.

> **Furlough** adjudicates an autonomous AI agent's telemetry and, on a CONFIRMED_MISBEHAVIOR
> verdict, cuts the agent's custodied GEN allowance to zero until a deadline that expires
> on its own.
>
> The cut is performed by validator consensus and lifted by a clock - never by a human. Anyone
> may open a case, so the operator cannot suppress a report against its own agent. The submitted
> journal must be signed by the bound agent over this contract, chain, case, claim, URL and
> journal bytes; unsigned or replayed evidence is rejected before a model call. A confirmed
> verdict suspends access; it never destroys funds.
>
> Validators independently re-fetch and re-authenticate, reduce the journal to a banded,
> identifier-free digest, and compare only a three-value enum - never free-text rationale.
>
> Deployed to Studionet (`0x84795e25Ae0BF5337829b614493D054c1c15c907`) with 106 hermetic tests.
> A signed case reached CONFIRMED_MISBEHAVIOR, an unsigned copy INSUFFICIENT_EVIDENCE, and a
> signed benign case FALSE_REPORT.

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
| Deployment | `https://explorer-studio.genlayer.com/address/0x84795e25Ae0BF5337829b614493D054c1c15c907` - Studio, the network the contract is on |
| How to test | See "How-to path" below - five walletless steps |
| Expected verification outcome | See the exact copy below the steps |
| Evidence | Contract page above; deploy tx https://explorer-studio.genlayer.com/tx/0x04d2cfa2dc7c7dc66b0c6d4946b9081b5fc7dd6ce938de4b17a8e934ef53e2f1; signed case https://explorer-studio.genlayer.com/tx/0xe476c03040aaf16f8c4c68939a7ed60bd2990cfcda77e10fb89efa64fc69f5d3; unsigned case https://explorer-studio.genlayer.com/tx/0xfcac4e30bd25c080c93c6ff90f0e7c054124821c6506055ae8949d864f7f8151; benign case https://explorer-studio.genlayer.com/tx/0xb6090a9fb5826496f202617da6be019db0ee210e1bbed9231b67c89474414ca8; https://github.com/vincentofweb3/furlough#readme; https://github.com/vincentofweb3/furlough/blob/master/references/traceability.md |
| Demo video | Not present. The portal's `Demo URL (YouTube or X) · required` field is labelled **Agent Tank hackathon**, whose build window closed 17 September 2026. If the live form asks for a demo URL, that is an Agent Tank submission, not this Builder project package - stop and flag it. |

### How-to path

Use these five steps in the portal's **How-to** section.

| # | Optional heading | Instruction |
| --- | --- | --- |
| 01 | Open the live board | Go to https://furlough-dt8b.vercel.app/live/. No wallet is needed. Wait for the status to load and confirm `OPERATING`, network `Studionet - chain 61999`, `default cut window 900s`, and 3 cases on record. |
| 02 | Read the signed case | Find `live-v2-auth-1`. Confirm verdict `CONFIRMED_MISBEHAVIOR`, `authenticated=True`, cut armed `2026-10-23T00:54:12Z`, expires `2026-10-23T01:09:12Z`, and the line "lifted by the clock, no transaction". |
| 03 | Verify both transactions | Open https://furlough-dt8b.vercel.app/verify/. Find `live-v2-auth-1`, open tx `0xe476c03040aaf16f8c4c68939a7ed60bd2990cfcda77e10fb89efa64fc69f5d3` in Studio Explorer, and confirm `FINALIZED` / `CONFIRMED_MISBEHAVIOR`. Then open `live-v2-unsigned-1` tx `0xfcac4e30bd25c080c93c6ff90f0e7c054124821c6506055ae8949d864f7f8151`; confirm `FINALIZED` / `INSUFFICIENT_EVIDENCE`. |
| 04 | Confirm there was no unlock | On the same `/verify/` page, scroll to the cut table. Confirm `live-v2-auth-1` lists `0` unlock txs and "by the clock", armed `00:54:12Z`, deadline `01:09:12Z`, lifted `01:09:12Z`. The unsigned case has no cut at all. |
| 05 | Run the tests | Clone https://github.com/vincentofweb3/furlough and run `python3.12 scripts/check_env.py --fetch` once, then `python3.12 -m pytest -q`. Expect `106 passed`, with no network and no API key during the suite. |

**Expected verification outcome - copy this:**

> Existing Studionet deployment, not newly generated. The path shows a working breaker: `OPERATING` on chain 61999, 3 cases filed, 900s default. `live-v2-auth-1` is signed, `CONFIRMED_MISBEHAVIOR`, and its cut lifted at `2026-10-23T01:09:12Z` by the clock. `live-v2-unsigned-1` is the same journal bytes without a signature and is `INSUFFICIENT_EVIDENCE` - no model, no cut. `live-v2-benign-1` is signed and `FALSE_REPORT`. The cut table shows 0 unlock txs; tests pass 106/106. Contract: `0x84795e25Ae0BF5337829b614493D054c1c15c907`. Read-only: no wallet or gas.

**Form honesty note:** use §4 for the limits. Do not imply the funded value loop ran live or that
a case was filed through MetaMask; neither happened. The three live cases were filed through the
CLI, and the updated report console has not been exercised through a browser wallet yet. The SDK
write path was validated by one owner-policy transaction on the previous deployment.

---

## 2. Repository

- [x] Public - committed and pushed to `github.com/vincentofweb3/furlough`
- [x] `README.md` states the problem, the mechanism and the honest limits in the first screen
- [x] `LICENSE` present (MIT)
- [ ] CI badge green for v2 - `.github/workflows/tests.yml` runs the suite on each push; the v2
      commit/push is pending, so the local 106-test run is the current evidence
- [x] `docs/CONSENSUS.md` - the safety argument, written to be disputed, every claim mapped to a test
- [x] `references/traceability.md` - criterion → feature → code → test → demo moment
- [x] `docs/PLAN.md` - what is done, what is blocked, what is deliberately not done
- [x] `scripts/live_check.py`, `scripts/sign_journal.py` and `viewer/` - walletless live status,
      signed-envelope helper, and wallet-signed report and owner consoles, deployed on Vercel and
      mirrored on GitHub Pages

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
| 2 | Show the settlement tests, or a funded local run - not the unfunded live deployment | "transfers are atomic; a failed child is repaired by callback or `reconcile()`" | Value safety |
| 3 | Publish a signed journal; open a case **from the report console** | "anyone may report, but only the bound agent's signed bytes can cut" | Authentication + permissionlessness |
| 4 | Show `get_case()` - verdict, rationale, digest, window, `authenticated` | "the model wrote a rationale nobody compared; only the enum was agreed" | Consensus design |
| 5 | `is_cut() == true`, `allowance_remaining() == 0` | "nobody did this. validators did" | N1 |
| 6 | **Wait out the window. Read only.** No transaction. | "…and nobody undid it. the clock did" | **N3 - the whole product** |

Then, if time: show the unsigned copy of the same journal - `INSUFFICIENT_EVIDENCE`, no cut - and
a signed benign journal - `FALSE_REPORT`, cut untouched. A breaker that fires on everything, or
on an anonymous document, is not a breaker.

**Capture as screenshots:** a fresh `CUT ACTIVE` board and the same board after expiry (`lifted by
the clock`, no transaction) against `live-v2-auth-1`. The files in `docs/screenshots/` show the
previous v1 deployment and must not be presented as v2 evidence. The v2 viewer build must be
deployed before capturing.

---

## 4. Honest limits - put these in the form too

A reviewer who finds an unclaimed hole discounts everything else. These are already in
`README.md` and `CONSENSUS.md` §11; repeating them in the submission costs nothing.

- **Not audited.** Testnet contribution. Do not use with real value.
- **Authenticated is not truthful.** The contract proves the bound agent's key signed this exact
  contract, chain, case, claim, URL and journal bytes. A compromised agent key can still sign
  false telemetry. Authentication raises the bar; it is not an oracle.
- **The hermetic gate does not prove two real models agree.** The test model is a deterministic
  stand-in keyed on the measured bands. Three live cases have finalized, which exercises the live
  path; that is not proof that independent models agree.
- **Bands are hand-calibrated** against fixtures, not derived from observed agent traffic.
- **The live run had no money in it.** The v2 deployment has `deposited == 0`, so deposit, draw,
  refund and recovery were not demonstrated with real GEN. They are covered by the custody and
  settlement tests and disclosed here rather than implied.
- **A signed journal can still spend model budget.** There is no bond or rate limit on
  `open_case`; weak evidence should end at `INSUFFICIENT_EVIDENCE`, and a compromised agent key
  can sign a false loop.
- **The consoles are a convenience, not part of the safety argument.** The board renders public
  reads. The report console calls `open_case`; the owner console changes future policy. Neither
  holds a key, and neither can lift a cut. The v2 report path has not yet been exercised through
  a browser wallet.
- **Single agent per contract.** Multi-agent and swarms are out of scope by decision.

---

## 5. Why this scores on the three words

No weights are invented here; the program publishes none.

- **Novelty** - no on-chain circuit breaker exists for AI agents where no human performs the
  action. The self-expiry is the part that is hard to copy: `allowance_remaining()` reads a
  clock, so the recovery path contains no method at all.
- **Complexity** - independent-fetch consensus with an anti-equivocation reduction, secp256k1
  authentication bound to six fields, and custodied value accounting with atomic settlement and
  recovery. Three properties that are easy to state and easy to get wrong: only the enum crosses
  the boundary, a journal that merely *grew* must reduce byte-identically, and a failed transfer
  may not silently change the allowance.
- **Impact** - AI & Agents. A deployed primitive for agent custody, and the contract earns dev
  fees on the points it generates.

---

## 6. Blockers before submission

| # | Blocker | State |
| --- | --- | --- |
| 1 | Deploy v2 | **done** - contract `0x84795e25Ae0BF5337829b614493D054c1c15c907`, tx `0x04d2cfa2…53e2f1`, FINALIZED. No faucet needed: Studionet is zero-fee |
| 2 | Authenticated live case under real validator LLMs | **done** - `live-v2-auth-1` tx `0xe476c030…69f5d3`, FINALIZED, `CONFIRMED_MISBEHAVIOR`, `authenticated=True` |
| 3 | Unsigned copy rejected | **done** - `live-v2-unsigned-1` tx `0xfcac4e30…f7f8151`, FINALIZED, `INSUFFICIENT_EVIDENCE`, `authenticated=False`, no cut |
| 4 | Signed benign case | **done** - `live-v2-benign-1` tx `0xb6090a9f…414ca8`, FINALIZED, `FALSE_REPORT`, no cut |
| 5 | Confirm the cut lifts by itself, no transaction | **done** - armed `2026-10-23T00:54:12Z`, expired `01:09:12Z`; a public read at `01:10:50Z` returned `cut_active=false` / `cut none` with no transaction |
| 6 | Deposit GEN so the allowance is visibly cut and restored | **skipped by decision** - the live cases ran against a zero allowance and this is not claimed. Accounting, atomic settlement and recovery are proven by tests |
| 7 | Fresh v2 screenshots | **pending** - `docs/screenshots/` still shows v1; capture only after the v2 viewer is deployed |
| 8 | Commits pushed, repo public | **pending** - the v2 contract, tests, scripts, viewer and docs are uncommitted; the user commits and pushes manually |
| 9 | Vercel/Pages serve the v2 viewer | **pending** - code is updated locally; the live sites still serve the old build until the commit triggers deployment |
| 10 | GitHub OAuth verification on portal.genlayer.com | human |
| 11 | Submission logo | **done** - `viewer/public/logo.png`, 1024x1024 RGBA PNG, 24 KB; inside the portal's 128-2048 px and 2 MB limits |

**Before submitting:** verify OAuth, open every link in the form, and check the live board renders
after the v2 viewer deploy and after Studionet's next reset. Item 6 stays skipped and is stated
plainly rather than implied away; the live records above are the claim, and a link that 404s is
worse than no link.

Asimov is not a fallback: its per-transaction gas cap is 2^24, and this contract's source is about
53 KB - well over the cap. The 5 GEN sent to the deployer on Asimov cannot deploy it.

Studionet resets periodically. If the deployed address disappears, re-deploy; do not debug it.
