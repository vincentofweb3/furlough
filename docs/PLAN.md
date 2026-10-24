# Furlough - execution plan

Written after Stage 7 (contract complete, suite green) and after a full defect review of that
stage. It covers what is left, what is blocked, and in what order. It is deliberately short:
the project is one contract, and a plan longer than this would be a plan nobody finishes.

Read this alongside [`SPEC.md`](SPEC.md) (what it is) and [`CONSENSUS.md`](CONSENSUS.md)
(why it is safe).

---

## Where we actually are

| Stage | Scope | State |
| --- | --- | --- |
| 1–3 | Authenticate, fetch, reduce, adjudicate, retain | done |
| 4–6 | Custody, cut arming, expiry | done |
| 7 | Hermetic gate | done - 122 tests, no network |
| 7b | Defect review of Stages 1–7 | done - 8 findings, all fixed, all re-verified by mutation |
| 8 | Traceability matrix | done - [`../references/traceability.md`](../references/traceability.md) |
| 9 | Submission package | ready locally - [`SUBMISSION.md`](SUBMISSION.md); v3 viewer build passes, Vercel/Pages refresh and portal submission remain human |
| live | Live deploy + smoke test | **done on Studionet** - signed cut, signed false report, unsigned and foreign-agent rejection |
| 10 | Readiness checklist | done - see below |

The contract-complete milestone was committed as `c11c693` (earlier `9c84413`) and pushed to
`github.com/vincentofweb3/furlough`. The v3 authentication/settlement changes, their tests, the
viewer updates and this documentation are uncommitted; the user commits and pushes manually. A
v3 Studionet deploy exists; see [`DEPLOY.md`](DEPLOY.md). Asimov is blocked by its
per-transaction gas cap, not by funding.

---

## The live deployment

Studionet charges no gas, so **no faucet is needed**: `deploy/deploy_studionet.py` prices the
transaction at zero and a zero-balance key can deploy. The contract is live.

| | |
| --- | --- |
| network | Studionet, chain 61999 |
| contract | `0xf6434915c52fF21C74d3aDb1CeA9AE68DB8e8Eb0` |
| deploy tx | `0x9156b52a3794d7d133307f6aa9225aa0b4a6cae4d3cdd73b67ae8c191addad17` - FINALIZED |
| bound agent | `0x7adE3852187F6FDAC7798c826620F49a9D529964` |
| bound observer | `0x69780b792B74376D22232668EDCa18008195cD3A` - immutable |
| signed case | `live-v3-auth-1` tx `0x1b1ee7baf91def4cfdd6f6cabc63f05dba32242e73ef12e59d7bade8a50916df` - `CONFIRMED_MISBEHAVIOR`, `authenticated=True`, `agent_matches=True` |
| signed benign case | `live-v3-benign-1` tx `0xc591d813602c7d9c524f2d6854e05f258418ab43b34c15041fb8581250ede04a` - `FALSE_REPORT`, `authenticated=True` |
| unsigned case | `live-v3-unsigned-1` tx `0xd9f6f7c6353b21b2e6fcd4c634ca39d30edea649e17942f8f4030634aab8d27f` - `INSUFFICIENT_EVIDENCE`, no model |
| foreign-agent case | `live-v3-foreign-1` tx `0xdf4b907b87260262aa2e718464e62afe527a3d14104f552f6b1bb3c3f1b4c4e7` - `INSUFFICIENT_EVIDENCE`, `authenticated=True`, `agent_matches=False`, no model |
| live verdict | one signed cut; expired by clock with no transaction |

Studionet resets periodically; treat the address as disposable and re-deploy.

**The live chain requires the runner header.** The first deploy finalized but executed to
`invalid_contract absent_runner_comment` - exactly the W010 warning this project had
deliberately left unfixed. GenVM refuses any contract without
`# { "Depends": "py-genlayer:1jb45aa8…" }` on line 1, and the header is now present.

**Asimov has a per-transaction gas cap of 2^24 (16,777,216).** Two facts, both measured: the
source is now about 53 KB, and pubdata is charged per byte. `eth_sendRawTransaction` rejects
anything over the cap with `gas limit too high`. The 5 GEN
sent to the deployer on Asimov cannot deploy this contract; a source under roughly 19.8 KB
would fit. Studionet is the supported target.

The old blocker - "Studionet deployment needs a funded key, and funding needs a human in
GenLayer Studio" - was wrong twice over: Studionet is free to transact on, and the faucet was
never the thing standing in the way. The WAF detail was correct and still applies to Asimov:
`python-requests`-spoofed agents get 403, `genlayer-py` and browser agents get 200.

---

## Why the review in Stage 7b mattered

The suite was green and the safety argument in `CONSENSUS.md` was, on its face, mapped test by
test. Three of those mappings did not hold. Each was found by **deleting the behaviour and
checking whether a test noticed**:

| Claim | What the test actually did | Verdict |
| --- | --- | --- |
| §5 "a missing journal never reaches the model" | asserted the verdict, which the `agent_matches` mock produces anyway | **tautology** |
| §6 "the allegation is data-framed" | emptying the claim from the prompt changed nothing | **unproven** |
| §4 "60 and 360 steps band identically" | only ever digested the 360 variant | **half a claim** |

The second one led somewhere worse than a bad test. Writing a proper framing test meant asking
what "framed as data" means when the frame is `<allegation>…</allegation>` and the claim is
attacker-controlled: **a reporter could write `</allegation>` into their own claim, close the
data block early, and have the rest read as instruction** - placed directly above the sentence
declaring the measurements authoritative. That was a live injection hole in the contract's
second line of defence. It is fixed (`_frame_untrusted`), pinned by a test, and documented.

The lesson generalises: *a green suite is evidence that the tests assert something, not
evidence that they assert the right thing.* Every claim in `CONSENSUS.md` is now either backed
by a test that fails when the behaviour is deleted, or explicitly marked as not testable here.

---

## What is done, and how it was verified

Eight findings, all fixed:

| # | Finding | Fix | Proof |
| --- | --- | --- | --- |
| 1 | §5 short-circuit unproven | assert no model mock matched; added positive control | mutation now **fails** |
| 2 | §6 framing unproven, and escapable | `_frame_untrusted`; three framing tests | mutation now **fails** |
| 3 | §4 banding half-asserted | assert digest *identity* across multipliers | mutation now **fails** |
| 4 | `_strip_us` corrupted negative offsets, producing an unparseable clock | canonicalise any offset form to `…Z` | mutation now **fails** |
| 5 | `+00:00` vs `Z` inverted `window_closed` at the exact expiry second - a cut that never lifts | same canonicalisation | mutation now **fails** |
| 6 | `leader_verdict` was a duplicate of `verdict` dressed as provenance | removed; `validator_agreed` documented for what it is | `test_case_record_carries_no_duplicate_verdict_field` |
| 7 | `set_journal_url_template` was dead and implied owner control of the evidence | removed | `test_contract_exposes_no_owner_controlled_evidence_source` |
| 8 | `case_id` was the only uncapped attacker string | rejected above 128 chars | `test_an_over_long_case_id_is_rejected` |

Also: an out-of-range `--cut-seconds` is now rejected at deploy instead of silently becoming 900.

### One more thing, found by accident

Running `genvm-lint check` during this review broke the test suite - `ImportError: cannot import
name 'gl' from 'genlayer'`, 87 errors, with the contract entirely innocent. The linter extracts a
newer, incompatible GenVM runner into the same cache `gltest` reads, and `gltest` picks the
lexicographically last runner it finds. `SDK_VERSION` pins the bundle *version* but not the runner
*hash*, so it does not prevent this on its own.

This matters for submission: a reviewer's first action is to run the tests, and if their cache is
polluted they get an environmental failure that looks like a broken contract. So the recovery is
now scripted and documented - `scripts/check_env.py --fix`, in the README quick start and in
`docs/DEPLOY.md`. It was verified by breaking the cache on purpose, confirming the script detects
it, running the fix, and confirming the suite returns to 122.

The `genvm-lint` dependency-header warning (W010) is now fixed, and the reason it was left
unfixed is gone. The warning was real: the **live chain refuses a contract without the header**
(`invalid_contract absent_runner_comment`). The header does not break the gate any more because
the incompatible runner it used to resolve to is quarantined by `scripts/check_env.py --fix`, so
the canonical hash - `py-genlayer:1jb45aa8…`, straight from the GenLayer docs - resolves
correctly. The suite is still 122 passed with the header in place.

```
$ python3.12 -m pytest -q
122 passed
```

---

## Remaining work

**Done offline, listed so nothing is assumed:**

- [x] Defect review of Stages 1–7, with mutation verification
- [x] Stage 8 - traceability matrix
- [x] Stage 9 - submission package ready
- [x] `LICENSE`, CI workflow, `.env.example`
- [x] Spec acceptance criteria checked against reality rather than left unticked

**Live on Studionet, done:**

- [x] Deploy - no faucet needed; zero-fee transactions
- [x] Record the **finalized** tx hash and contract address
- [x] Publish an observer-signed live runaway journal naming the bound agent and open a real case;
      verdict `CONFIRMED_MISBEHAVIOR`, `authenticated=True`, `agent_matches=True`
- [x] Confirm the cut armed (`is_cut() == true`, `allowance_remaining() == 0`) under real LLMs
- [x] Confirm an unsigned copy of the same journal is rejected as `INSUFFICIENT_EVIDENCE`
      without reaching a model
- [x] Confirm the agent's spending key cannot self-attest
- [x] Confirm an observer-signed journal naming another agent is rejected by `agent_matches`
      without reaching a model
- [x] Confirm a signed benign journal reaches `FALSE_REPORT`
- [x] Confirm the signed cut lifts by itself with no transaction
- [x] Deposit GEN so the allowance is non-zero - **skipped by decision.** The live cases ran
      against a zero allowance; the value loop is covered by the custody and settlement tests.
- [x] Next.js + TypeScript site (`viewer/`) with a walletless live board and wallet-signed report
      and owner consoles, plus the live CLI (`scripts/live_check.py`)
- [x] `genlayer-js 1.2.0` write path exercised against the **previous v1** contract with a
      local testnet key: re-set the window to 900s (tx `0xc34b234a…5851f8d`, not via MetaMask)
- [x] Fresh v3 `OPERATING` and verify screenshots from the local build, reading the live v3
      contract - `docs/screenshots/viewer-v3-live.png`, `viewer-v3-verify.png`
- [ ] Active `CUT ACTIVE` and post-expiry screenshots against the deployed v3 viewer - the
      `live-v3-auth-1` window expired before capture; v1 files are archived, not evidence
- [x] Make the repository public and enable GitHub Pages
- [ ] Refresh Vercel and GitHub Pages to the v3 build - Vercel still serves v2; local `npm run build` passes
- [x] Submission logo - `viewer/public/logo.png`, 1024x1024 PNG, within the portal limits
- [ ] Verify GitHub OAuth on portal.genlayer.com and submit the project application

The report console has not yet filed a live case through MetaMask: the four live cases were
filed through the CLI, and the SDK transaction above validates the same encoding and finality
path, not the browser wallet UX. Treat the console as newly built, not as battle-tested.

**Deliberately not done, and why:**

- A funded live value loop. The allowance is zero on the v3 deployment, so deposit/draw and
  settlement recovery are covered by hermetic tests and disclosed rather than faked.
- A rate limit or bond for signed junk cases. The unsigned path is already free to reject; a
  signed but weak journal can spend model inference, and a compromised observer key (or an
  observer controlled by the agent's operator) can sign a false loop. Key compromise and
  observer independence are disclosed in `CONSENSUS.md` §11.

---

## Known-weak, by severity

1. **Authenticated is not truthful.** The contract proves the bound observer's key signed this
   exact case, claim, URL, subject agent and journal bytes. A compromised observer key can still
   sign false telemetry, and an observer controlled by the agent's operator is not
   organisationally independent. A distinct agent spending key cannot sign evidence; owner role
   reassignment is a disclosed limit. Disclosed in
   `CONSENSUS.md` §11.
2. **The hermetic gate does not prove two real models agree.** The test model is a deterministic
   stand-in. Real inter-model agreement needs the live deploy - which is why the smoke test is
   not optional.
3. **Bands are hand-calibrated** against fixtures, not derived from real agent traffic.
4. **The live value loop is unfunded.** Transfer and recovery paths are covered by tests, not
   by live GEN. Disclosed in `CONSENSUS.md` §11.