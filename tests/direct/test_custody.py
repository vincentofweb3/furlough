"""Custody: real GEN, and the accounting that makes the cut worth anything.

The invariant under test throughout is value conservation: ``deposited - drawn`` is the
allowance, a cut only ever suspends access to it, and neither counter is ever reduced by an
adjudication. A breaker that can destroy funds is not a breaker, it is a confiscation.
"""

import pytest

from conftest import AGENT, DEPOSIT, REPORTER, draw, open_case  # noqa: F401
from fixtures import OBSERVER


# --------------------------------------------------------------------- deposit


def test_deposit_funds_the_custodian(funded):
    stats = funded.stats()
    assert stats["deposited"] == DEPOSIT
    assert stats["drawn"] == 0
    assert stats["allowance_remaining"] == DEPOSIT


def test_deposit_requires_value(funded, direct_vm):
    direct_vm.sender = funded.stats()["owner"]
    direct_vm.value = 0
    with pytest.raises(Exception):
        funded.deposit()


def test_only_owner_may_deposit(breaker, direct_vm):
    direct_vm.sender = REPORTER
    direct_vm.value = DEPOSIT
    with pytest.raises(Exception):
        breaker.deposit()


def test_deposits_accumulate(funded, direct_vm):
    direct_vm.sender = funded.stats()["owner"]
    direct_vm.value = 10**21
    funded.deposit()
    assert funded.stats()["deposited"] == DEPOSIT + 10**21


# --------------------------------------------------------------------- draw


def test_agent_draws_against_the_allowance(funded, direct_vm):
    draw(funded, direct_vm, 2 * 10**20)
    assert funded.stats()["drawn"] == 2 * 10**20
    assert funded.allowance_remaining() == DEPOSIT - 2 * 10**20


def test_nobody_but_the_agent_may_draw(funded, direct_vm):
    for who in (funded.stats()["owner"], REPORTER, "0x" + "99" * 20):
        direct_vm.sender = who
        with pytest.raises(Exception):
            funded.draw(10**18)


def test_draw_cannot_exceed_the_allowance(funded, direct_vm):
    with pytest.raises(Exception):
        draw(funded, direct_vm, DEPOSIT + 1)


def test_draw_must_be_positive(funded, direct_vm):
    for bad in (0, -1):
        with pytest.raises(Exception):
            draw(funded, direct_vm, bad)


# --------------------------------------------------------------------- refund


def test_owner_refunds_the_undrawn_balance(funded, direct_vm):
    draw(funded, direct_vm, 10**20)
    direct_vm.sender = funded.stats()["owner"]
    funded.refund(10**20)
    assert funded.stats()["deposited"] == DEPOSIT - 10**20


def test_refund_cannot_launder_a_live_cut(funded, direct_vm):
    """Without this guard the breaker would be cosmetic: withdraw, fund a fresh wallet, carry on."""
    open_case(funded, direct_vm, "runaway")
    direct_vm.sender = funded.stats()["owner"]
    with pytest.raises(Exception):
        funded.refund(10**18)
    assert funded.stats()["deposited"] == DEPOSIT


def test_refund_becomes_possible_once_the_cut_lifts(funded, direct_vm):
    from conftest import T0, advance_time
    from datetime import datetime, timedelta

    open_case(funded, direct_vm, "runaway")
    advance_time(direct_vm, (datetime.fromisoformat(T0.replace("Z", "+00:00")) + timedelta(seconds=900)).isoformat().replace("+00:00", "Z"))
    direct_vm.sender = funded.stats()["owner"]
    funded.refund(10**18)
    assert funded.stats()["deposited"] == DEPOSIT - 10**18


def test_refund_cannot_exceed_the_remaining_balance(funded, direct_vm):
    direct_vm.sender = funded.stats()["owner"]
    with pytest.raises(Exception):
        funded.refund(DEPOSIT + 1)


def test_refund_requires_ownership(funded, direct_vm):
    direct_vm.sender = REPORTER
    with pytest.raises(Exception):
        funded.refund(10**18)


# --------------------------------------------------------------------- the invariant


def test_a_cut_never_moves_either_counter(funded, direct_vm):
    """The whole safety argument, in one test.

    Adjudication may suspend access to the balance. It may not touch the balance. Deposit and
    draw are the only two writers of `deposited` and `drawn`.
    """
    before = funded.stats()

    open_case(funded, direct_vm, "runaway")
    during = funded.stats()
    assert during["deposited"] == before["deposited"]
    assert during["drawn"] == before["drawn"]
    assert during["allowance_remaining"] == 0
    assert during["underlying_allowance"] == before["deposited"]

    open_case(funded, direct_vm, "fanout", case_id="fanout2")
    still = funded.stats()
    assert still["deposited"] == before["deposited"]
    assert still["drawn"] == before["drawn"]

    from conftest import T0, advance_time
    from datetime import datetime, timedelta

    advance_time(direct_vm, (datetime.fromisoformat(T0.replace("Z", "+00:00")) + timedelta(seconds=3600)).isoformat().replace("+00:00", "Z"))
    after = funded.stats()
    assert after["deposited"] == before["deposited"]
    assert after["drawn"] == before["drawn"]
    assert after["allowance_remaining"] == before["deposited"]


def test_allowance_never_goes_negative(funded, direct_vm):
    draw(funded, direct_vm, DEPOSIT)
    assert funded.allowance_remaining() == 0
    with pytest.raises(Exception):
        draw(funded, direct_vm, 1)


# --------------------------------------------------------------------- public reads


def test_case_record_is_public_and_complete(funded, direct_vm):
    open_case(funded, direct_vm, "runaway")
    case = funded.get_case("runaway")
    assert case.reporter == REPORTER
    assert case.agent == AGENT
    assert case.finalized is True
    assert case.validator_agreed is True
    assert case.verdict == "CONFIRMED_MISBEHAVIOR"
    assert case.rationale
    assert case.digest.signature


def test_case_record_carries_no_duplicate_verdict_field(funded, direct_vm):
    """`leader_verdict` used to sit next to `verdict` and always equal it.

    It was a copy dressed up as provenance: an auditor reading two identical fields would
    reasonably infer two independent observations, which is exactly the wrong inference. Asserted
    so it cannot be reintroduced as a "convenience" alias.
    """
    open_case(funded, direct_vm, "runaway")
    assert not hasattr(funded.get_case("runaway"), "leader_verdict")


def test_observer_is_fixed_at_deploy_and_has_no_setter(funded):
    """No owner transaction can rotate the witness while a case is being adjudicated.

    A mutable observer would let the operator invalidate a reporter's already-published
    envelope by changing the verifier. Rotation is a new deployment, not a live write.
    """
    assert funded.stats()["observer"] == OBSERVER
    assert not hasattr(funded, "set_observer")


def test_contract_exposes_no_owner_controlled_evidence_source(funded):
    """`set_journal_url_template` used to exist and was never read.

    An owner-gated "where the journal comes from" knob implies the owner can steer adjudication.
    They cannot -- `open_case` takes the URL from whoever filed -- and a surface that contradicts
    the permissionless argument is worse than no surface at all.
    """
    for gone in ("set_journal_url_template", "journal_url"):
        assert not hasattr(funded, gone)
    assert "journal_url_template" not in funded.stats()


def test_reads_need_no_wallet(funded, direct_vm):
    """Reads are pure. Anyone can audit the record without sending a transaction."""
    open_case(funded, direct_vm, "runaway")
    direct_vm.sender = "0x" + "77" * 20
    assert funded.get_verdict("runaway") == "CONFIRMED_MISBEHAVIOR"
    assert funded.is_cut() is True
    assert "runaway" in list(funded.list_cases())


def test_unknown_case_is_an_error(funded):
    with pytest.raises(Exception):
        funded.get_case("nope")
    with pytest.raises(Exception):
        funded.get_verdict("nope")


def test_stats_separate_cuts_from_cases(funded, direct_vm):
    open_case(funded, direct_vm, "runaway")
    open_case(funded, direct_vm, "benign", case_id="benign2")
    open_case(funded, direct_vm, "unreachable", case_id="none2")
    stats = funded.stats()
    assert stats["cases"] == 3
    assert stats["cuts"] == 1