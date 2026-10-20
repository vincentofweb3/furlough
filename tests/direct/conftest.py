"""Shared fixtures for the Furlough hermetic test gate.

No network. The journal fetch and the model are both mocked from recorded evidence, which is
what makes the gate repeatable: if the contract ever stopped passing measurements to the
model, these patterns would stop matching and the expected verdicts would not be produced.
"""

import json
import sys
from pathlib import Path

import pytest
from gltest.direct import pytest_plugin  # noqa: F401  (registers direct_* fixtures)

sys.path.insert(0, str(Path(__file__).parent))
from fixtures import FIXTURES, case_payload  # noqa: E402

CONTRACT = "contracts/agent_breaker.py"

# Pin the GenVM SDK bundle explicitly.
#
# Without this, gltest picks the lexicographically newest tarball in ~/.cache. Running
# `genvm-lint check` drops symlinks named after the *linter's* bundle versions into that same
# cache, so "newest" can silently become a bundle with a different internal layout and every
# test fails with "No py-genlayer runners found in tarball".
SDK_VERSION = "v0.3.0-rc7"

OWNER = "0x" + "aa" * 20
AGENT = "0x" + "cc" * 20
REPORTER = "0x" + "bb" * 20
DEPOSIT = 5 * 10**21  # 5000 GEN

T0 = "2026-06-15T12:00:00Z"


def _web_mocks():
    """Serve the recorded journals. `unreachable` is a real HTTP 404."""
    mocks = []
    for name, fixture in FIXTURES.items():
        payload = fixture["payload"]
        if payload is None:
            mocks.append((fixture["journal"], 404, "not found"))
        else:
            mocks.append((fixture["journal"], 200, json.dumps(payload)))
    return mocks


def _llm_mocks():
    """A deterministic stand-in model that keys off the *observed measurements*.

    This is what makes the gate a real test rather than a tautology: if the contract stopped
    forwarding measurements, these patterns would stop matching.

    It does NOT test that two different real models agree. That needs a live network and is
    out of scope for a hermetic gate.
    """
    return [
        # Identity first, and deliberately so: a journal that names a different agent is not
        # evidence about this agent, whatever its shape looks like. Matching it before the
        # shape checks would let a foreign retry loop read as a confirmed case.
        (
            r"journal_belongs_to_the_bound_agent: False",
            json.dumps(
                {
                    "verdict": "INSUFFICIENT_EVIDENCE",
                    "rationale": "The journal names a different agent, so it is not evidence "
                    "about this one.",
                }
            ),
        ),
        # Fan-out: many distinct destinations.
        (
            r"distinct_destinations_band: MANY",
            json.dumps(
                {
                    "verdict": "CONFIRMED_MISBEHAVIOR",
                    "rationale": "Fourteen distinct destinations in one window is a spray, not work.",
                }
            ),
        ),
        # Retry loop: many steps, one tool, mostly errors.
        (
            r"concentration_on_single_tool: EXTREME",
            json.dumps(
                {
                    "verdict": "CONFIRMED_MISBEHAVIOR",
                    "rationale": "Sixty steps through a single tool with an EXTREME error "
                    "share is a retry loop against a failing endpoint.",
                }
            ),
        ),
        # Ordinary varied work.
        (
            r"journal_retrieved: True",
            json.dumps(
                {
                    "verdict": "FALSE_REPORT",
                    "rationale": "Varied tools, three destinations, spend inside the allowance.",
                }
            ),
        ),
    ]


@pytest.fixture
def breaker(direct_vm, direct_deploy):
    """Deployed contract with journal + model mocks registered and the custodian funded."""
    for url, status, body in _web_mocks():
        direct_vm.mock_web(url, {"method": "GET", "status": status, "body": body})
    for pattern, response in _llm_mocks():
        direct_vm.mock_llm(pattern, response)

    direct_vm.sender = OWNER
    direct_vm.value = 0
    contract = direct_deploy(CONTRACT, owner=OWNER, agent=AGENT, sdk_version=SDK_VERSION)
    return contract


@pytest.fixture
def funded(breaker, direct_vm):
    """A funded custodian with a known allowance, so cut/lift assertions have a baseline.

    The clock is pinned to T0 first: the direct harness otherwise starts at wall-clock time,
    which would make every expiry assertion depend on when the suite was run.
    """
    advance_time(direct_vm, T0)
    direct_vm.sender = OWNER
    direct_vm.value = DEPOSIT
    breaker.deposit()
    direct_vm.value = 0
    return breaker


def advance_time(vm, iso: str) -> None:
    """Move the chain clock to `iso`.

    `VMContext.warp()` sets `vm._datetime` and refreshes the cached `gl.message`, but it does
    NOT update `gl.message_raw["datetime"]` -- see `_refresh_gl_message` in
    gltest/direct/vm.py, which only refreshes sender_address and origin_address. Because
    `message_raw` is decoded once at contract import time, a contract reading the transaction
    datetime (which is what a real Intelligent Contract must do) cannot see a bare `warp()`.

    So we do both. This is a harness workaround, not contract behaviour: on a real node the
    datetime arrives fresh with every transaction.
    """
    import genlayer.gl as _gl

    vm.warp(iso)
    _gl.message_raw["datetime"] = iso


def open_case(contract, vm, case_name: str, case_id: str | None = None):
    """Open one fixture as an arbitrary (non-owner, non-agent) sender."""
    fixture = FIXTURES[case_name]
    vm.sender = REPORTER
    return contract.open_case(case_payload(case_id or case_name, fixture))


def draw(contract, vm, amount: int):
    """Draw as the bound agent."""
    vm.sender = AGENT
    return contract.draw(amount)


@pytest.fixture
def contract_module(direct_deploy):
    """The loaded contract module.

    The stage-1 reduction helpers are pure and deterministic, so they can be exercised
    directly rather than only through a full adjudicate() round trip.
    """
    direct_deploy(CONTRACT, owner=OWNER, agent=AGENT, sdk_version=SDK_VERSION)
    return sys.modules["_contract_agent_breaker"]