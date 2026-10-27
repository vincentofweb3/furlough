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
export GENLAYER_PRIVATE_KEY=0x...          # testnet owner/deploy key only
export GENLAYER_OBSERVER=0x...             # separate witness address
python3.12 deploy/deploy_studionet.py \
  --agent 0x<agent-address> --observer "$GENLAYER_OBSERVER" --cut-seconds 900
```

Options:

| Flag | Default | Meaning |
| --- | --- | --- |
| `--network` | `studionet` | or `testnet_asimov` |
| `--agent` | *required* | the address whose allowance the breaker cuts |
| `--observer` | *required* | the separate witness address whose key must sign evidence; must differ from the agent |
| `--cut-seconds` | `900` | default cut window; the contract hard-caps this at 3600 |
| `--consensus-max-rotations` | `5` | lower this, or the deploy stalls waiting on rotations |

Deployment is a consensus transaction and takes real time to finalise. If it times out waiting
for rotations, the contract is usually deployed but unsettled - check the explorer before
re-deploying, because a second deploy creates a second contract.

## Live deployment

Deployed on Studionet on 2026-10-23; live cases finalized 2026-10-23 to 2026-10-24:

| | |
| --- | --- |
| contract | `0xf6434915c52fF21C74d3aDb1CeA9AE68DB8e8Eb0` |
| deploy tx | `0x9156b52a3794d7d133307f6aa9225aa0b4a6cae4d3cdd73b67ae8c191addad17` - FINALIZED |
| bound agent | `0x7adE3852187F6FDAC7798c826620F49a9D529964` |
| bound observer | `0x69780b792B74376D22232668EDCa18008195cD3A` - immutable; no setter |
| signed case | `live-v3-auth-1` tx `0x1b1ee7baf91def4cfdd6f6cabc63f05dba32242e73ef12e59d7bade8a50916df` - `CONFIRMED_MISBEHAVIOR`, `authenticated=True`, `agent_matches=True` |
| benign signed case | `live-v3-benign-1` tx `0xc591d813602c7d9c524f2d6854e05f258418ab43b34c15041fb8581250ede04a` - `FALSE_REPORT`, `authenticated=True` |
| unsigned case | `live-v3-unsigned-1` tx `0xd9f6f7c6353b21b2e6fcd4c634ca39d30edea649e17942f8f4030634aab8d27f` - `INSUFFICIENT_EVIDENCE`, `authenticated=False`, no model |
| foreign-agent case | `live-v3-foreign-1` tx `0xdf4b907b87260262aa2e718464e62afe527a3d14104f552f6b1bb3c3f1b4c4e7` - `INSUFFICIENT_EVIDENCE`, `authenticated=True`, `agent_matches=False`, no model |
| replay case | `live-v3-auth-2` tx `0x98cfab02967ffce30d853cd3857faf124baefab3b1e943c5b537ee6df79fc03e` - `INSUFFICIENT_EVIDENCE`, case binding rejected, no model |
| live verdict | one signed cut; it lifted by the clock with no transaction |

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
   await client.writeContract({
     address,
     functionName: 'deposit',
     value: 5n * 10n ** 21n,
   });
   ```

2. **Publish an observer-signed journal envelope.** The observer writes or attests a window of
   the agent's behaviour, then signs the exact journal bytes, contract, chain, case id, claim,
   subject agent and final URL. A distinct agent spending key cannot sign evidence. The owner can
   reassign the agent role, including to the observer; see `CONSENSUS.md` §11. The contract
   rejects a raw, unsigned or foreign-agent journal. Host a placeholder at the final URL, sign,
   then replace it with the envelope:

   ```bash
   set -a; . ./.env; set +a
   python3.12 scripts/sign_journal.py \
     --contract 0x<deployed> --agent 0x<agent-address> --case-id demo-runaway \
     --claim "The agent hammered one failing endpoint 60 times and burned its allowance." \
     --journal-url https://example.com/journal/demo-runaway.json \
     --journal-file journal.json --out envelope.json
   ```

   `GENLAYER_OBSERVER_PRIVATE_KEY` is the testnet-only witness key; it must differ from the
   agent's key. The signature binds the URL, so the URL must exist before signing and must serve
   the finished envelope.

3. **Open a case.** Permissionless - anyone may call it, but the URL must serve the signed
   envelope.

   ```json
   {
     "case_id": "demo-runaway",
     "claim": "The agent hammered one failing endpoint 60 times and burned its allowance.",
     "journal_url": "https://example.com/journal/demo-runaway.json"
   }
   ```

4. **Read the outcome.** `get_case(case_id)` returns the verdict, rationale, digest and the
   whole window. `digest.authenticated` tells you whether the bound observer signed it;
   `digest.agent_matches` tells you whether the journal names the bound agent.
   `is_cut()` and `seconds_remaining()` need no wallet.

## Smoke test after deploy

The loop is scripted; one command reads it, one files a case:

```bash
python3.12 scripts/live_check.py status
python3.12 scripts/live_check.py open-case --journal-url SIGNED_ENVELOPE_URL --claim "..."
```

In contract terms:

```bash
# 1. allowance before any case
allowance_remaining() == deposited

# 2. open a case against a signed runaway journal, wait for FINALIZED
#    LIVE: live-v3-auth-1 -- CONFIRMED_MISBEHAVIOR, authenticated=True, agent_matches=True
get_verdict("live-v3-auth-1") == "CONFIRMED_MISBEHAVIOR"
get_case("live-v3-auth-1").digest.authenticated == true
get_case("live-v3-auth-1").digest.agent_matches == true
is_cut() == true
allowance_remaining() == 0

# 3. do nothing. After default_cut_seconds:
is_cut() == false
allowance_remaining() == deposited      # restored with no transaction
#    LIVE: the signed cut armed at 2026-10-23T09:01:53Z and expired at 09:16:53Z, with no
#    transaction in between. The value loop (deposited > 0) was skipped by decision and is
#    covered by the custody and settlement tests.
```

Step 3 is the whole product. If it needs a human to complete, the deployment is wrong.

## Hosting the site

`viewer/` is a Next.js + TypeScript app with `output: "export"`, so the build produces plain
static files and there is no server runtime. Reads are walletless; the report and owner consoles
use the visitor's browser wallet for signatures. `genlayer-js` is bundled, not loaded from a CDN.

**Vercel (primary).** The site is live at https://furlough-dt8b.vercel.app/ with **Root Directory**
set to `viewer/` and the framework on automatic detection (Next.js). Every push to `master`
auto-deploys. The old `PYTHON_ENTRYPOINT_NOT_FOUND` failure is resolved by that root-directory
fix. With the CLI:

```bash
npx vercel --cwd viewer --prod    # the first run prompts for login
```

**GitHub Pages (mirror).** `.github/workflows/pages.yml` runs `npm ci` and `npm run build` in
`viewer/` with `NEXT_PUBLIC_BASE_PATH=/furlough`, then publishes `viewer/out`. The site is live at
https://vincentofweb3.github.io/furlough/.

Neither host needs environment variables. The contract address and chain constants live in
`viewer/lib/contract.ts`; `viewer/vercel.json` adds security headers.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| `cannot import name 'gl' from 'genlayer'` | a **newer, incompatible** runner was extracted into `~/.cache` by a previous `genvm-lint check`. See "the cache trap" below. `python3.12 scripts/check_env.py --fix` |
| `HTTP Error 404` fetching `genvm-universal.tar.xz` | upstream re-cut the v0.3.0-rc7 release and removed the asset `genlayer-test` 0.29.2 requests. Seed the checksum-pinned mirror: `python3.12 scripts/check_env.py --fetch` |
| `No py-genlayer runners found in tarball` | the SDK bundle in `~/.cache` was clobbered. `rm -rf ~/.cache/gltest-direct/extracted` and re-run |
| `gas limit too high` on Asimov | the network caps one transaction at 2^24 gas. This source is about 53 KB and its pubdata cost is far over that cap; deploy to Studionet, or keep the source under roughly 19.8 KB. |
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
python3.12 -m pytest -q                  # expect: 122 passed
```

Run `--fix` after any `genvm-lint check`. The script moves the bad runner to
`unusable-runners/` rather than renaming it in place - an `unusable-` prefix sorts *above* a hash,
so an in-place rename leaves the broken runner winning the sort.

> `genvm-lint check` runs its lint rules clean on this contract, but its SDK-load validation
> cannot complete on this machine - the `runners/py-genlayer/*.tar` bundle entries have been
> pruned from `~/.cache`. The same failure occurs on known-good reference contracts, so it is an
> environment limitation rather than a defect in this contract. The 122-test suite runs the
> contract against a real GenVM bundle and is the stronger check.