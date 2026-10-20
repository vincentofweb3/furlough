"""The cut: bounded, armed by consensus, and lifted by nobody.

Everything in this file is the product claim. If any of these assertions is wrong, the
project is a monitoring dashboard with extra steps.
"""

from datetime import datetime, timedelta, timezone

import pytest

from conftest import AGENT, DEPOSIT, REPORTER, T0, advance_time, draw, open_case  # noqa: F401


def _shift(iso: str, seconds: int) -> str:
    base = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    return (base + timedelta(seconds=seconds)).isoformat().replace("+00:00", "Z")


# --------------------------------------------------------------------- arming


def test_confirmed_case_arms_a_cut(funded, direct_vm):
    open_case(funded, direct_vm, "runaway")
    case = funded.get_case("runaway")
    assert case.verdict == "CONFIRMED_MISBEHAVIOR"
    assert case.cut is True
    assert case.armed_at == T0
    assert case.expires_at == _shift(T0, 900)
    assert funded.is_cut() is True


def test_false_report_arms_nothing(funded, direct_vm):
    open_case(funded, direct_vm, "benign")
    assert funded.is_cut() is False
    assert funded.get_case("benign").expires_at == ""
    assert funded.stats()["cuts"] == 0


def test_insufficient_evidence_arms_nothing(funded, direct_vm):
    open_case(funded, direct_vm, "unreachable")
    assert funded.is_cut() is False


# --------------------------------------------------------------------- the cut bites


def test_allowance_is_zero_while_the_window_is_open(funded, direct_vm):
    assert funded.allowance_remaining() == DEPOSIT
    open_case(funded, direct_vm, "runaway")
    assert funded.allowance_remaining() == 0
    assert funded.underlying_allowance() == DEPOSIT


def test_agent_cannot_draw_while_cut(funded, direct_vm):
    open_case(funded, direct_vm, "runaway")
    with pytest.raises(Exception):
        draw(funded, direct_vm, 10**18)


def test_seconds_remaining_counts_down(funded, direct_vm):
    open_case(funded, direct_vm, "runaway")
    assert funded.seconds_remaining() == 900
    advance_time(direct_vm, _shift(T0, 300))
    assert funded.seconds_remaining() == 600


# --------------------------------------------------------------------- it lifts itself


def test_allowance_returns_when_the_window_closes_with_no_transaction(funded, direct_vm):
    """The headline behaviour: nobody undoes the cut. The clock does."""
    open_case(funded, direct_vm, "runaway")
    assert funded.allowance_remaining() == 0

    advance_time(direct_vm, _shift(T0, 899))
    assert funded.allowance_remaining() == 0, "one second early and it must still be cut"

    advance_time(direct_vm, _shift(T0, 900))
    assert funded.allowance_remaining() == DEPOSIT, "allowance must return by itself"
    assert funded.is_cut() is False
    assert draw(funded, direct_vm, 10**18) == 10**18


def test_cut_outliving_a_full_hour_is_impossible(funded, direct_vm):
    """A cut can never be longer than MAX_CUT_SECONDS, whatever the clock says."""
    open_case(funded, direct_vm, "runaway")
    advance_time(direct_vm, _shift(T0, 3600))
    assert funded.is_cut() is False
    assert funded.allowance_remaining() == DEPOSIT


def test_owner_cannot_shorten_an_armed_window(funded, direct_vm):
    """The owner may change future policy. It cannot touch a live window.

    There is no method that does, and this test pins that down: changing the policy to 1
    second during an active 900-second cut must leave the deadline alone.
    """
    open_case(funded, direct_vm, "runaway")
    armed_at = funded.cut_deadline()

    direct_vm.sender = funded.stats()["owner"]
    funded.set_default_cut_seconds(1)

    assert funded.cut_deadline() == armed_at
    advance_time(direct_vm, _shift(T0, 899))
    assert funded.is_cut() is True


def test_owner_cannot_set_an_out_of_range_policy(funded, direct_vm):
    direct_vm.sender = funded.stats()["owner"]
    for bad in (0, 3601, -5):
        with pytest.raises(Exception):
            funded.set_default_cut_seconds(bad)


def test_reap_clears_the_record_only_after_the_window_closes(funded, direct_vm):
    open_case(funded, direct_vm, "runaway")

    assert funded.reap_expired("runaway") is False
    assert funded.get_case("runaway").lifted_at == ""

    advance_time(direct_vm, _shift(T0, 900))
    assert funded.reap_expired("runaway") is True
    assert funded.get_case("runaway").lifted_at == _shift(T0, 900)
    assert funded.cut_deadline() == ""
    # Purely cosmetic: the allowance had already returned before anything was reaped.
    assert funded.allowance_remaining() == DEPOSIT


def test_reap_unknown_case_is_an_error(funded, direct_vm):
    with pytest.raises(Exception):
        funded.reap_expired("nope")


# --------------------------------------------------------------------- composition


def test_second_confirmed_case_extends_rather_than_shortens(funded, direct_vm):
    """Two overlapping confirmations compose by taking the later deadline."""
    open_case(funded, direct_vm, "runaway")
    first = funded.cut_deadline()

    advance_time(direct_vm, _shift(T0, 600))
    open_case(funded, direct_vm, "fanout", case_id="fanout2")

    assert funded.cut_deadline() > first, "a later confirmation must push the deadline out"
    assert funded.stats()["cuts"] == 2


def test_a_false_report_does_not_shorten_a_live_cut(funded, direct_vm):
    open_case(funded, direct_vm, "runaway")
    armed_at = funded.cut_deadline()
    open_case(funded, direct_vm, "benign", case_id="benign2")
    assert funded.cut_deadline() == armed_at
    assert funded.is_cut() is True


def test_an_earlier_confirmation_does_not_shorten_a_later_cut(funded, direct_vm):
    """The other half of composition: a shorter window arriving must not pull the deadline in.

    A fixed-length window opened later always ends later, so the only way to produce a
    competing *shorter* deadline is to shorten the policy first -- which is exactly what an
    operator under pressure would try.
    """
    open_case(funded, direct_vm, "runaway")
    later = funded.cut_deadline()
    assert later == _shift(T0, 900)

    direct_vm.sender = funded.stats()["owner"]
    funded.set_default_cut_seconds(30)

    advance_time(direct_vm, _shift(T0, 60))
    open_case(funded, direct_vm, "fanout", case_id="fanout2")

    # Its own window would have been T0+90. It confirmed, but it does not take over.
    assert funded.get_case("fanout2").expires_at == _shift(T0, 90)
    assert funded.cut_deadline() == later
    assert funded.get_case("fanout2").verdict == "CONFIRMED_MISBEHAVIOR"
    assert funded.get_case("fanout2").cut is True
    assert funded.stats()["cut_case_id"] == "runaway"
    assert funded.stats()["cuts"] == 2

    # And the cut still ends when the binding window ends, not when the short one did.
    advance_time(direct_vm, _shift(T0, 90))
    assert funded.is_cut() is True
    advance_time(direct_vm, _shift(T0, 900))
    assert funded.is_cut() is False


def test_changing_the_agent_does_not_escape_a_cut(funded, direct_vm):
    """Re-pointing the contract at a compliant agent is not a way around a suspension."""
    open_case(funded, direct_vm, "runaway")
    direct_vm.sender = funded.stats()["owner"]
    funded.set_agent("0x" + "ee" * 20)
    assert funded.is_cut() is True
    assert funded.allowance_remaining() == 0