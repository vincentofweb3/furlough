"""Settlement: a transfer either moves value atomically or is repaired afterwards.

The first vulnerability was accounting committed before a transfer whose failure was then
swallowed. These tests cover both halves of the fix: a synchronous failure reverts the whole
turn, and a child that fails after finality returns through the refund callback or the
permissionless ``reconcile`` fallback.
"""

import pytest

from conftest import AGENT, DEPOSIT, OWNER, REPORTER, draw


def _agent_bytes() -> bytes:
    return bytes.fromhex(AGENT[2:])


def _install_success_hook(vm):
    """Simulate a successful EVM value transfer, including the balance debit."""

    def hook(vm, request):
        payload = request.get("EthSend")
        if payload is None:
            return None
        amount = int(payload.get("value", 0))
        source = bytes(vm._contract_address)
        recipient = payload["address"].as_bytes
        vm._balances[source] = vm._balances.get(source, 0) - amount
        vm._balances[recipient] = vm._balances.get(recipient, 0) + amount
        return {"ok": None}

    vm._gl_call_hook = hook


def _install_failing_hook(vm):
    """Simulate a synchronous settlement failure inside this transaction."""

    def hook(vm, request):
        if "EthSend" in request:
            raise RuntimeError("settlement route unavailable")
        return None

    vm._gl_call_hook = hook


def test_synchronous_draw_failure_reverts_all_accounting(funded, direct_vm):
    direct_vm.deal(direct_vm._contract_address, DEPOSIT)
    _install_failing_hook(direct_vm)

    with pytest.raises(Exception):
        draw(funded, direct_vm, 10**18)

    stats = funded.stats()
    assert stats["deposited"] == DEPOSIT
    assert stats["drawn"] == 0
    assert stats["recovered"] == 0
    assert stats["allowance_remaining"] == DEPOSIT


def test_synchronous_refund_failure_reverts_all_accounting(funded, direct_vm):
    direct_vm.deal(direct_vm._contract_address, DEPOSIT)
    _install_failing_hook(direct_vm)

    direct_vm.sender = OWNER
    with pytest.raises(Exception):
        funded.refund(10**18)

    stats = funded.stats()
    assert stats["deposited"] == DEPOSIT
    assert stats["recovered"] == 0


def test_successful_transfer_moves_value_and_keeps_accounting(funded, direct_vm):
    direct_vm.deal(direct_vm._contract_address, DEPOSIT)
    _install_success_hook(direct_vm)

    draw(funded, direct_vm, 2 * 10**20)

    source = bytes(direct_vm._contract_address)
    assert direct_vm._balances[source] == DEPOSIT - 2 * 10**20
    assert direct_vm._balances[_agent_bytes()] == 2 * 10**20
    assert funded.stats()["drawn"] == 2 * 10**20
    assert funded.stats()["recovered"] == 0
    assert funded.allowance_remaining() == DEPOSIT - 2 * 10**20


def test_failed_child_draw_is_recovered_by_the_callback(funded, direct_vm):
    direct_vm.deal(direct_vm._contract_address, DEPOSIT)
    draw(funded, direct_vm, 10**18)
    assert funded.allowance_remaining() == DEPOSIT - 10**18

    direct_vm.value = 10**18
    funded.__on_errored_message__()
    direct_vm.value = 0

    stats = funded.stats()
    assert stats["recovered"] == 10**18
    assert stats["drawn"] == 10**18
    assert stats["deposited"] == DEPOSIT
    assert stats["allowance_remaining"] == DEPOSIT


def test_failed_child_refund_is_recovered_by_the_callback(funded, direct_vm):
    direct_vm.deal(direct_vm._contract_address, DEPOSIT)
    direct_vm.sender = OWNER
    funded.refund(10**18)
    assert funded.stats()["deposited"] == DEPOSIT - 10**18

    direct_vm.value = 10**18
    funded.__on_errored_message__()
    direct_vm.value = 0

    assert funded.stats()["recovered"] == 10**18
    assert funded.stats()["deposited"] == DEPOSIT - 10**18
    assert funded.stats()["allowance_remaining"] == DEPOSIT


def test_reconcile_recovers_a_missing_callback(funded, direct_vm):
    direct_vm.deal(direct_vm._contract_address, DEPOSIT)
    draw(funded, direct_vm, 10**18)
    assert funded.stats()["recovered"] == 0

    direct_vm.sender = REPORTER
    funded.reconcile()

    stats = funded.stats()
    assert stats["recovered"] == 10**18
    assert stats["allowance_remaining"] == DEPOSIT


def test_reconcile_is_idempotent(funded, direct_vm):
    direct_vm.deal(direct_vm._contract_address, DEPOSIT)
    draw(funded, direct_vm, 10**18)

    funded.reconcile()
    funded.reconcile()

    assert funded.stats()["recovered"] == 10**18
    assert funded.allowance_remaining() == DEPOSIT


def test_recovered_value_can_be_drawn_again(funded, direct_vm):
    direct_vm.deal(direct_vm._contract_address, DEPOSIT)
    draw(funded, direct_vm, 10**18)

    direct_vm.value = 10**18
    funded.__on_errored_message__()
    direct_vm.value = 0

    assert draw(funded, direct_vm, 10**18) == 10**18
    assert funded.allowance_remaining() == DEPOSIT - 10**18


def test_reconcile_does_not_credit_a_short_balance(funded, direct_vm):
    draw(funded, direct_vm, 10**18)
    funded.reconcile()
    assert funded.stats()["recovered"] == 0
    assert funded.allowance_remaining() == DEPOSIT - 10**18
