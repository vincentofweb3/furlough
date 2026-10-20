"""Deploy AgentBreaker to a GenLayer network.

    GENLAYER_PRIVATE_KEY=0x... python3.12 deploy/deploy_studionet.py

Defaults to Studionet. Pass `--network testnet_asimov` to target Asimov instead.

Studionet charges no gas, so a Studionet deploy does not need a funded key. Asimov does need
one, and it enforces a per-transaction gas cap of 2**24: a contract source much larger than
about 20 KB will not fit in a single deploy there.
"""

import argparse
import os
import sys
import time
from pathlib import Path

from eth_utils import to_checksum_address
from genlayer_py import create_account, create_client
from genlayer_py.chains import studionet, testnet_asimov
from genlayer_py.types import TransactionStatus

ROOT = Path(__file__).resolve().parent.parent
CONTRACT = ROOT / "contracts" / "agent_breaker.py"

NETWORKS = {"studionet": studionet, "testnet_asimov": testnet_asimov}

# GenVM consensus needs a few rotations before a transaction finalises on a public testnet.
MAX_ROTATIONS = 5

# Studionet's block limit is 30M gas and its base fee is zero. Stay well under the limit.
STUDIONET_GAS = 20_000_000


def use_zero_fee_transactions() -> None:
    """Price a Studionet transaction at zero.

    genlayer-py prices every non-local network at base_fee + 2 gwei, which stops an unfunded
    account from deploying even though Studionet charges nothing. Replace the fee preparation
    with a zero-price transaction sized under the block limit.
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


def main() -> int:
    parser = argparse.ArgumentParser(description="Deploy the Furlough AgentBreaker contract.")
    parser.add_argument("--network", choices=sorted(NETWORKS), default="studionet")
    parser.add_argument("--agent", required=True, help="Address the breaker is bound to")
    parser.add_argument("--cut-seconds", type=int, default=900, help="Default cut window (max 3600)")
    parser.add_argument(
        "--consensus-max-rotations",
        type=int,
        default=MAX_ROTATIONS,
        help="Lower this if the deploy stalls waiting for rotations",
    )
    args = parser.parse_args()

    key = os.environ.get("GENLAYER_PRIVATE_KEY")
    if not key:
        print("GENLAYER_PRIVATE_KEY is not set. Testnet keys only -- never a mainnet key.")
        return 2

    if not CONTRACT.exists():
        print(f"contract not found at {CONTRACT}")
        return 2

    if args.network == "studionet":
        use_zero_fee_transactions()

    account = create_account(key)
    owner = to_checksum_address(account.address)
    agent = to_checksum_address(args.agent)
    client = create_client(chain=NETWORKS[args.network], account=account)

    print(f"network   {args.network}")
    print(f"deployer  {owner}")
    print(f"agent     {agent}")
    print(f"cut window {args.cut_seconds}s (hard max 3600)")
    print()

    started = time.time()
    tx_id = client.deploy_contract(
        code=CONTRACT.read_text(),
        args=[owner, agent],
        kwargs={"default_cut_seconds": args.cut_seconds},
        consensus_max_rotations=args.consensus_max_rotations,
    )
    print(f"tx        {tx_id}")
    print("waiting   for FINALIZED")

    try:
        receipt = client.wait_for_transaction_receipt(
            transaction_hash=tx_id,
            status=TransactionStatus.FINALIZED,
            interval=3000,
            retries=120,
            full_transaction=True,
        )
    except Exception as exc:
        print(f"\nnot finalized: {exc}")
        return 1

    status = receipt.get("status_name", "UNKNOWN")
    contract = receipt.get("recipient")
    print(f"status    {status} after {time.time() - started:.0f}s")
    print(f"contract  {contract}")

    if status != "FINALIZED":
        print("\nNot FINALIZED. Do not treat the address as live.")
        return 1

    try:
        state = client.read_contract(address=contract, function_name="stats")
    except Exception as exc:
        print(f"\ncontract {contract} is not callable: {exc}")
        print("A deploy can finalise with an execution error; check the transaction result.")
        return 1

    print(
        f"verified  agent={state.get('agent')} owner={state.get('owner')} "
        f"default_cut_seconds={state.get('default_cut_seconds')}"
    )
    print("\nDeployed and FINALIZED.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
