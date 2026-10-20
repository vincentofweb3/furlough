#!/usr/bin/env python3.12
"""Live status board for the deployed Furlough breaker on Studionet.

    python3.12 scripts/live_check.py status
    python3.12 scripts/live_check.py open-case --journal-url URL --claim "..."

`status` is read-only and needs no wallet: it prints the bound agent, the custody figures,
the cut window and every case on record, newest first.

`open-case` files an allegation. It is permissionless by design, so any testnet key works,
and Studionet charges no gas, so the script prices the transaction at zero. It needs
``GENLAYER_PRIVATE_KEY`` and waits for FINALIZED before printing the verdict.

The address defaults to the recorded Studionet deployment; override it with ``--address``
or ``FURLOUGH_CONTRACT``.
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone

from genlayer_py import create_account, create_client
from genlayer_py.chains import studionet
from genlayer_py.types import TransactionStatus

DEFAULT_CONTRACT = "0x7Ee18844C80395E23f06Cf75D2B998723E36804f"
EXPLORER = "https://explorer-studio.genlayer.com"

STUDIONET_GAS = 20_000_000
MAX_ROTATIONS = 5
FINALIZED_INTERVAL = 3000
FINALIZED_RETRIES = 120


def use_zero_fee_transactions() -> None:
    """Price a Studionet transaction at zero.

    genlayer-py prices every non-local network at base_fee + 2 gwei, which stops an unfunded
    account from writing even though Studionet charges nothing. Mirrors the deploy script.
    """
    import genlayer_py.contracts.actions as actions

    def prepare(self, sender, recipient, data, value=0):
        return {
            "from": sender,
            "nonce": hex(self.get_current_nonce(address=sender)),
            "data": data,
            "to": recipient,
            "value": hex(value),
            "gasPrice": hex(0),
            "chainId": self.chain.id,
            "gas": hex(STUDIONET_GAS),
        }

    actions._prepare_transaction = prepare


def field(record: object, name: str, default: object = "") -> object:
    if isinstance(record, dict):
        return record.get(name, default)
    return getattr(record, name, default)


def is_past(iso: str) -> bool:
    if not iso:
        return False
    try:
        moment = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    except ValueError:
        return False
    return moment <= datetime.now(timezone.utc)


def address_of(args: argparse.Namespace) -> str:
    return args.address or os.environ.get("FURLOUGH_CONTRACT") or DEFAULT_CONTRACT


def cmd_status(args: argparse.Namespace) -> int:
    client = create_client(chain=studionet, account=create_account())
    address = address_of(args)

    try:
        state = client.read_contract(address=address, function_name="stats")
    except Exception as exc:
        print(f"contract {address} is not callable: {exc}")
        return 1

    print(f"contract  {address}")
    print(f"explorer  {EXPLORER}")
    print(f"agent     {field(state, 'agent')}")
    print(f"owner     {field(state, 'owner')}")
    print(
        f"custody   deposited={field(state, 'deposited')} drawn={field(state, 'drawn')} "
        f"allowance={field(state, 'allowance_remaining')} underlying={field(state, 'underlying_allowance')}"
    )

    if field(state, "cut_active", False):
        remaining = client.read_contract(address=address, function_name="seconds_remaining")
        deadline = field(state, "cut_until")
        print(f"cut       ACTIVE until {deadline} ({remaining}s remaining), case {field(state, 'cut_case_id')}")
    else:
        deadline = field(state, "cut_until")
        suffix = f" (last window ended {deadline})" if deadline else ""
        print(f"cut       none{suffix}")

    cases = list(client.read_contract(address=address, function_name="list_cases"))
    print(
        f"cases     {field(state, 'cases')} on record, {field(state, 'cuts')} cuts, "
        f"default window {field(state, 'default_cut_seconds')}s"
    )

    for case_id in reversed(cases[-args.cases :]):
        case = client.read_contract(address=address, function_name="get_case", args=[case_id])
        verdict = field(case, "verdict")
        line = f"  {case_id}  {verdict}"
        if field(case, "cut", False):
            lifted = field(case, "lifted_at")
            expires = field(case, "expires_at")
            if lifted:
                line += f"  cut {field(case, 'armed_at')} to {expires}, lifted {lifted}"
            elif is_past(expires):
                line += f"  cut {field(case, 'armed_at')} to {expires}, lifted by clock"
            else:
                line += f"  cut ARMED {field(case, 'armed_at')} to {expires}"
        print(line)

    return 0


def cmd_open_case(args: argparse.Namespace) -> int:
    key = os.environ.get("GENLAYER_PRIVATE_KEY")
    if not key:
        print("GENLAYER_PRIVATE_KEY is not set. Testnet keys only -- never a mainnet key.")
        return 2

    address = address_of(args)
    case_id = args.case_id or f"cli-{int(time.time())}"
    payload = json.dumps(
        {"case_id": case_id, "claim": args.claim, "journal_url": args.journal_url}
    )

    use_zero_fee_transactions()
    account = create_account(key)
    client = create_client(chain=studionet, account=account)

    print(f"contract  {address}")
    print(f"reporter  {account.address}")
    print(f"case      {case_id}")
    print(f"journal   {args.journal_url}")
    print()

    started = time.time()
    try:
        tx_id = client.write_contract(
            address=address,
            function_name="open_case",
            args=[payload],
            consensus_max_rotations=MAX_ROTATIONS,
        )
    except Exception as exc:
        print(f"submission failed: {exc}")
        return 1

    print(f"tx        {tx_id}")
    print("waiting   for FINALIZED (consensus re-fetches and re-derives the evidence)")

    try:
        receipt = client.wait_for_transaction_receipt(
            transaction_hash=tx_id,
            status=TransactionStatus.FINALIZED,
            interval=FINALIZED_INTERVAL,
            retries=FINALIZED_RETRIES,
            full_transaction=True,
        )
    except Exception as exc:
        print(f"\nnot finalized: {exc}")
        return 1

    status = receipt.get("status_name", "UNKNOWN")
    print(f"status    {status} after {time.time() - started:.0f}s")
    if status != "FINALIZED":
        return 1

    case = client.read_contract(address=address, function_name="get_case", args=[case_id])
    digest = field(case, "digest", {})
    print(f"\nverdict   {field(case, 'verdict')}")
    if field(case, "cut", False):
        print(f"cut       armed until {field(case, 'expires_at')}")
    print(f"digest    {field(digest, 'signature')}")
    print(f"rationale {field(case, 'rationale')}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--address", help="Contract address (defaults to the recorded deployment)")
    sub = parser.add_subparsers(dest="command")

    status = sub.add_parser("status", help="Print live state and the case record")
    status.add_argument("--cases", type=int, default=5, help="How many recent cases to print")
    status.set_defaults(func=cmd_status)

    open_case = sub.add_parser("open-case", help="File an allegation and wait for the verdict")
    open_case.add_argument("--journal-url", required=True, help="Public URL of the agent journal")
    open_case.add_argument("--claim", required=True, help="What is alleged, in one sentence")
    open_case.add_argument("--case-id", help="Case id (default: cli-<epoch>)")
    open_case.set_defaults(func=cmd_open_case)

    args = parser.parse_args()
    if not args.command:
        return cmd_status(args)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
