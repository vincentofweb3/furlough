# Deploying to Studionet

Studionet resets periodically, so **treat any deployed address as disposable**. Re-deploy after
a reset rather than debugging a vanished contract.

## Prerequisites

- Python 3.12
- A key. **Studionet charges no gas**, so no funds are needed there - the deploy script prices
  the transaction at zero and an unfunded key deploys fine. Asimov needs a funded key.
- GenLayer SDK: `genlayer-test[sim]` and `genlayer-py`.

```bash
python3.12 -m pip install "genlayer-test[sim]==0.29.2" "genlayer-py==0.16.3"
```

## Deploy

```bash
export GENLAYER_PRIVATE_KEY=0x...       # testnet key only
python3.12 deploy/deploy_studionet.py --agent 0x<agent-address> --cut-seconds 900
```

Options:

| Flag | Default | Meaning |
| --- | --- | --- |
| `--network` | `studionet` | or `testnet_asimov` |
| `--agent` | *required* | the address the breaker is bound to |
| `--cut-seconds` | `900` | default cut window; the contract hard-caps this at 3600 |
| `--consensus-max-rotations` | `5` | lower this, or the deploy stalls waiting on rotations |

Deployment is a consensus transaction and takes real time to finalise. If it times out waiting
for rotations, the contract is usually deployed but unsettled - check the explorer before
re-deploying, because a second deploy creates a second contract.

## Live deployment

Deployed and exercised on Studionet on 2026-10-20:

| | |
| --- | --- |
| contract | `0x7Ee18844C80395E23f06Cf75D2B998723E36804f` |
| deploy tx | `0x2071117864281aa6c66906ecc90f914d69917b9590c1149653ca54e14f5cb905` - FINALIZED |
| live case tx | `0x2e466d7a8e0d17380a7ba29ffdfb12a6ff2fec90df5ecd1c6bff2eef5f760014` - FINALIZED |
| live verdict | `CONFIRMED_MISBEHAVIOR`, cut armed for 900s, real validator LLMs |

The contract **must** carry the runner header on line 1. Without it Studionet finalizes the
deploy and then cannot execute the contract at all (`invalid_contract absent_runner_comment`),
and every read returns "Contract not found":

```
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
```

That hash is the canonical one from the GenLayer docs. Do not add a second runner: it will make
`gltest` pick the wrong standard library (see "the cache trap").

## After deploying

1. **Fund the custodian.** `deposit()` is payable and owner-only. Without a balance the
   allowance is zero and there is nothing for a cut to protect.

   ```ts
   await client.writeContract({ address, functionName: 'deposit', value: 5n * 10n ** 21n, fees });
   ```

2. **Publish a journal.** The agent writes a window of its own behaviour to a URL and passes
   that URL to `open_case`. Schema is in `tests/direct/fixtures.py`.

3. **Open a case.** Permissionless - anyone may call it.

   ```json
   {
     "case_id": "demo-runaway",
     "claim": "The agent hammered one failing endpoint 60 times and burned its allowance.",
     "journal_url": "https://example.com/journal/demo-runaway.json"
   }
   ```

4. **Read the outcome.** `get_case(case_id)` returns the verdict, rationale, digest and the
   whole window. `is_cut()` and `seconds_remaining()` need no wallet.

## Smoke test after deploy

```bash
# 1. allowance before any case
allowance_remaining() == deposited

# 2. open a case against a runaway journal, wait for FINALIZED
#    LIVE: done against a zero allowance -- verdict CONFIRMED_MISBEHAVIOR, is_cut() == true
get_verdict("demo-runaway") == "CONFIRMED_MISBEHAVIOR"
is_cut() == true
allowance_remaining() == 0

# 3. do nothing. After default_cut_seconds:
is_cut() == false
allowance_remaining() == deposited      # restored with no transaction
#    LIVE: skipped by decision. The live case ran with a zero allowance; the value half of
#    steps 1 and 3 is covered by the hermetic custody tests only.
```

Step 3 is the whole product. If it needs a human to complete, the deployment is wrong.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| `cannot import name 'gl' from 'genlayer'` | a **newer, incompatible** runner was extracted into `~/.cache` by a previous `genvm-lint check`. See "the cache trap" below. `python3.12 scripts/check_env.py --fix` |
| `No py-genlayer runners found in tarball` | the SDK bundle in `~/.cache` was clobbered. `rm -rf ~/.cache/gltest-direct/extracted` and re-run |
| `gas limit too high` on Asimov | the network caps one transaction at 2^24 gas. This source estimates 33.2M there because pubdata is priced per byte; deploy to Studionet, or keep the source under roughly 19.8 KB. |
| Deploy FINALIZED but every read says `Contract … not found` | the contract has no runner header. GenVM rejected the code with `invalid_contract absent_runner_comment`; add the `# { "Depends": "py-genlayer:…" }` line as line 1. |
| `Studio-dev resets periodically` | expected. Re-deploy. |
| Deploy hangs on rotations | lower `--consensus-max-rotations`, or check the key is funded. |
| `Only the bound agent may draw` | `set_agent()` has not been called, or you are calling from the owner address. |
| `agent allowance is cut until the window expires` | the cut is working. Wait it out, or open a case from a later window. |

## The cache trap - read this before running `genvm-lint check`

This bit us during the Stage 7b review and it will bite a reviewer, because running the tests is
the first thing anyone does.

`gltest` picks a py-genlayer runner by taking the lexicographically **last** one it finds under
`~/.cache/gltest-direct/extracted/<version>/py-genlayer/`. Running `genvm-lint check` extracts a
newer runner into that same directory. That runner declares a different standard library, and the
suite then dies with:

```
ImportError: cannot import name 'gl' from 'genlayer'
```

which reads exactly like a broken contract and is not one. `SDK_VERSION` in
`tests/direct/conftest.py` pins the bundle *version*; it does **not** pin the runner *hash*, so on
its own it does not prevent this.

```bash
python3.12 scripts/check_env.py          # report
python3.12 scripts/check_env.py --fix    # quarantine the unusable runner
python3.12 -m pytest -q                  # expect: 87 passed
```

Run `--fix` after any `genvm-lint check`. The script moves the bad runner to
`unusable-runners/` rather than renaming it in place - an `unusable-` prefix sorts *above* a hash,
so an in-place rename leaves the broken runner winning the sort.

> `genvm-lint check` runs its lint rules clean on this contract, but its SDK-load validation
> cannot complete on this machine - the `runners/py-genlayer/*.tar` bundle entries have been
> pruned from `~/.cache`. The same failure occurs on known-good reference contracts, so it is an
> environment limitation rather than a defect in this contract. The 87-test suite runs the
> contract against a real GenVM bundle and is the stronger check.