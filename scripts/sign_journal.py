#!/usr/bin/env python3.12
"""Build a ``furlough/journal@2`` envelope for a raw agent journal.

    python3.12 scripts/sign_journal.py \
      --contract 0x... --case-id live-1 --claim "..." \
      --journal-url https://gist.githubusercontent.com/.../raw/journal.json \
      --journal-file journal.json --out envelope.json

The signature binds the exact journal URL, case id, claim, contract and chain, so the URL
must already exist when this runs. Host a placeholder at the final URL, sign, then replace
the placeholder with the envelope. The contract rejects an envelope signed for any other
URL, case, claim or deployment.

The signing key is read from ``GENLAYER_AGENT_PRIVATE_KEY`` by default. Testnet only.
"""

import argparse
import json
import os
import sys
from pathlib import Path

from eth_account import Account
from eth_utils import keccak

SCHEMA = "furlough/journal@2"
DEFAULT_CHAIN_ID = 61999


def _norm_address(value: object) -> str:
    text = str(value).strip().lower()
    return text[2:] if text.startswith("0x") else text


def _hashed(value: object) -> str:
    return "0x" + keccak(text=str(value)).hex()


def evidence_message(
    contract: object,
    chain_id: object,
    case_id: str,
    claim: str,
    agent: object,
    journal_url: str,
    journal_text: str,
) -> str:
    """Mirror ``AgentBreaker.evidence_message`` byte-for-byte."""
    return "\n".join(
        [
            SCHEMA,
            f"contract=0x{_norm_address(contract)}",
            f"chain_id={int(chain_id)}",
            f"case_id_keccak={_hashed(case_id)}",
            f"claim_keccak={_hashed(claim)}",
            f"agent=0x{_norm_address(agent)}",
            f"journal_url_keccak={_hashed(journal_url)}",
            f"journal_keccak={_hashed(journal_text)}",
        ]
    )


def build_envelope(
    *,
    contract: str,
    chain_id: int,
    case_id: str,
    claim: str,
    journal_url: str,
    journal_text: str,
    account: Account,
) -> dict:
    message = evidence_message(
        contract, chain_id, case_id, claim, account.address, journal_url, journal_text
    )
    signature = account.unsafe_sign_hash(keccak(text=message))
    return {
        "schema": SCHEMA,
        "agent": account.address,
        "case_id": case_id,
        "journal": journal_text,
        "pubkey": "0x" + account._key_obj.public_key.to_bytes().hex(),
        "signature": "0x" + signature.signature.hex(),
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--contract", required=True, help="Deployed AgentBreaker address")
    parser.add_argument("--chain-id", type=int, default=DEFAULT_CHAIN_ID)
    parser.add_argument("--case-id", required=True)
    parser.add_argument("--claim", required=True)
    parser.add_argument("--journal-url", required=True, help="Final public URL of the envelope")
    parser.add_argument("--journal-file", required=True, help="Raw journal JSON to sign")
    parser.add_argument(
        "--key-env",
        default="GENLAYER_AGENT_PRIVATE_KEY",
        help="Environment variable holding the testnet agent key",
    )
    parser.add_argument("--keep-agent", action="store_true", help="Do not set payload.agent to the signer")
    parser.add_argument("--out", help="Write the envelope here instead of stdout")
    args = parser.parse_args()

    key = os.environ.get(args.key_env)
    if not key:
        print(f"{args.key_env} is not set. Testnet keys only -- never a mainnet key.")
        return 2

    path = Path(args.journal_file)
    if not path.exists():
        print(f"journal file not found: {path}")
        return 2
    try:
        payload = json.loads(path.read_text())
    except ValueError as exc:
        print(f"journal is not valid JSON: {exc}")
        return 2
    if not isinstance(payload, dict):
        print("journal must be a JSON object")
        return 2

    account = Account.from_key(key)
    if not args.keep_agent:
        payload["agent"] = account.address

    journal_text = json.dumps(payload, indent=2, sort_keys=True) + "\n"
    envelope = build_envelope(
        contract=args.contract,
        chain_id=args.chain_id,
        case_id=args.case_id,
        claim=args.claim,
        journal_url=args.journal_url,
        journal_text=journal_text,
        account=account,
    )
    body = json.dumps(envelope, indent=2, sort_keys=True) + "\n"

    if args.out:
        Path(args.out).write_text(body)
        print(f"agent    {account.address}")
        print(f"contract {args.contract}")
        print(f"case     {args.case_id}")
        print(f"url      {args.journal_url}")
        print(f"wrote    {args.out}")
    else:
        sys.stdout.write(body)
    return 0


if __name__ == "__main__":
    sys.exit(main())
