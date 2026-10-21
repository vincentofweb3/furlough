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
| 1–3 | Fetch, reduce, adjudicate, retain | done |
| 4–6 | Custody, cut arming, expiry | done |
| 7 | Hermetic gate | done - 87 tests, no network |
| 7b | Defect review of Stages 1–7 | done - 8 findings, all fixed, all re-verified by mutation |
| 8 | Traceability matrix | done - [`../references/traceability.md`](../references/traceability.md) |
| 9 | Submission package | drafted - [`SUBMISSION.md`](SUBMISSION.md); live evidence now recorded |
| live | Live deploy + smoke test | **done on Studionet** - one live case reached `CONFIRMED_MISBEHAVIOR` |
| 10 | Readiness checklist | done - see below |

Committed as `9c84413` and pushed to `github.com/vincentofweb3/furlough`. A Studionet deploy
exists; see [`DEPLOY.md`](DEPLOY.md). Asimov is blocked by its per-transaction gas cap, not by
funding.

---

## The live deployment

Studionet charges no gas, so **no faucet is needed**: `deploy/deploy_studionet.py` prices the
transaction at zero and a zero-balance key can deploy. The contract is live.

| | |
| --- | --- |
| network | Studionet, chain 61999 |
| contract | `0x7Ee18844C80395E23f06Cf75D2B998723E36804f` |
| deploy tx | `0x2071117864281aa6c66906ecc90f914d69917b9590c1149653ca54e14f5cb905` - FINALIZED in 38s |
| live case tx | `0x2e466d7a8e0d17380a7ba29ffdfb12a6ff2fec90df5ecd1c6bff2eef5f760014` - FINALIZED in 53s |
| live verdict | `CONFIRMED_MISBEHAVIOR`, cut armed for 900s, real validator LLMs, `validator_agreed` |

Studionet resets periodically; treat the address as disposable and re-deploy.

**The live chain requires the runner header.** The first deploy finalized but executed to
`invalid_contract absent_runner_comment` - exactly the W010 warning this project had
deliberately left unfixed. GenVM refuses any contract without
`# { "Depends": "py-genlayer:1jb45aa8…" }` on line 1, and the header is now present.

**Asimov has a per-transaction gas cap of 2^24 (16,777,216).** Two facts, both measured:
the source estimates 33.2M gas there because pubdata is charged per byte, and
`eth_sendRawTransaction` rejects anything over the cap with `gas limit too high`. The 5 GEN
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
it, running the fix, and confirming the suite returns to 87.

The `genvm-lint` dependency-header warning (W010) is now fixed, and the reason it was left
unfixed is gone. The warning was real: the **live chain refuses a contract without the header**
(`invalid_contract absent_runner_comment`). The header does not break the gate any more because
the incompatible runner it used to resolve to is quarantined by `scripts/check_env.py --fix`, so
the canonical hash - `py-genlayer:1jb45aa8…`, straight from the GenLayer docs - resolves
correctly. The suite is still 87 passed with the header in place.

```
$ python3.12 -m pytest -q
87 passed
```

---

## Remaining work

**Done offline, listed so nothing is assumed:**

- [x] Defect review of Stages 1–7, with mutation verification
- [x] Stage 8 - traceability matrix
- [x] Stage 9 - submission package drafted
- [x] `LICENSE`, CI workflow, `.env.example`
- [x] Spec acceptance criteria checked against reality rather than left unticked

**Live on Studionet, done:**

- [x] Deploy - no faucet needed; zero-fee transactions
- [x] Record the **finalized** tx hash and contract address
- [x] Publish a live runaway journal and open a real case; verdict `CONFIRMED_MISBEHAVIOR`
- [x] Confirm the cut armed (`is_cut() == true`, `allowance_remaining() == 0`) under real LLMs
- [x] Deposit GEN so the allowance is non-zero - **skipped by decision.** The live case ran
      against a zero allowance; the value loop is covered by the hermetic custody tests, not live.
- [x] Confirm the cut lifts by itself with no transaction - `is_cut()` false and
      `seconds_remaining()` 0 at `2026-10-20T18:34:07Z`, with no transaction in between
- [x] A second and third live case filed through `scripts/live_check.py` (`cli-check-1`,
      `ui-check-1`) - same verdict, and every window lifted by the clock
- [x] Multi-page static site (`viewer/`) and live CLI (`scripts/live_check.py`), so a steward
      can see the breaker without reading the contract
- [x] Screenshots of the cut and the no-transaction lift - `docs/screenshots/`, captured from
      the current site against `ui-check-1`
- [x] Make the repository public and enable GitHub Pages
- [ ] Verify GitHub OAuth on points.genlayer.com, optionally import the site on Vercel, submit

**Deliberately not done, and why:**

- A write-enabled frontend (wallet connect, filing from the page) - out of scope by decision
  (`SPEC.md`). Stewards judge novelty, complexity and impact; a polished dApp does not move those
  and costs days. A read-only viewer was added after the live run so the breaker can be seen
  working; it holds no keys.
- Signed-digest commitment so a journal provably came from the bound agent. This is the single
  most important missing piece and it is a *new stage*, not a patch - see `CONSENSUS.md` §11.
  Attempting it now would risk the deploy that the submission depends on.

---

## Known-weak, by severity

1. **The journal is unauthenticated.** Anyone can publish a journal naming the bound agent's
   address and describing a retry loop, and it will cut that agent. The address is public. The
   whole defence is one boolean, `agent_matches`. Disclosed in `CONSENSUS.md` §11; the fix is
   the obvious one and is the first thing to build after this.
2. **The hermetic gate does not prove two real models agree.** The test model is a deterministic
   stand-in. Real inter-model agreement needs the live deploy - which is why the smoke test is
   not optional.
3. **Bands are hand-calibrated** against fixtures, not derived from real agent traffic.
4. **`_settle` is a traced no-op on this SDK version.** Accounting is correct; actual GEN
   movement is best-effort. Disclosed in `CONSENSUS.md` §11.