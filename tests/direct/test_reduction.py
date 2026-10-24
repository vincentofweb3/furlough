"""The reduction: what may cross the consensus boundary, and what may not.

This is the anti-equivocation layer. The leader and every validator fetch the journal
independently, so anything that can move between two fetches seconds apart must be banded or
dropped before it is ever shown to consensus. These tests are the evidence for that claim.
"""

import json

import pytest

from fixtures import AGENT, FIXTURES, OBSERVER


def _digest(module, payload, agent, deposited=0):
    return module.reduce_journal(payload, agent, deposited)


def test_volatile_fields_do_not_change_the_digest(contract_module):
    """Two journals describing the same window, with every volatile field different.

    The reduction must be byte-identical. If it is not, two honest validators fetching the
    same document seconds apart will disagree, burn the round, and the case will never settle.
    """
    base = dict(FIXTURES["benign"]["payload"])
    noisy = dict(base)
    noisy["window_start"] = 1799999999
    noisy["generated_at"] = "2026-06-15T23:59:59Z"
    noisy["duration_ms"] = 987654321
    noisy["schema"] = "agent-journal/1"

    a = _digest(contract_module, base, AGENT, 10**21)
    b = _digest(contract_module, noisy, AGENT, 10**21)

    assert a == b
    assert contract_module.digest_signature(a) == contract_module.digest_signature(b)


def test_step_counts_are_banded_not_counted(contract_module):
    """A journal that has merely grown must reduce to the identical digest.

    The old version digested only the grown variant and asserted a single band name, so
    re-splitting `_STEP_BANDS` so that 60 steps and 360 steps landed on different names passed
    the suite. CONSENSUS.md claims the two are indistinguishable, so the *identity* is asserted
    here -- across a spread of multipliers, not just one.
    """
    base = FIXTURES["runaway"]["payload"]
    agent = AGENT

    sixty = _digest(contract_module, base, agent, 10**24)

    grown = dict(base)
    grown["steps"] = base["steps"] * 6  # 60 -> 360
    three_sixty = _digest(contract_module, grown, agent, 10**24)

    assert three_sixty["step_count_band"] == "MANY"
    assert sixty == three_sixty, "a journal that only grew must reduce identically"

    for multiple in (1, 2, 6, 7, 120, 121):
        payload = dict(base)
        payload["steps"] = base["steps"] * multiple
        assert _digest(contract_module, payload, agent, 10**24) == sixty

    assert "60" not in json.dumps(sixty)


def test_timestamp_spellings_canonicalise_to_one_form(contract_module):
    """Every spelling `_iso_now` can see must collapse to `YYYY-MM-DDTHH:MM:SSZ`.

    `_iso_now` returns whatever the node put in `gl.message_raw["datetime"]` while `_iso_shift`
    always emits a trailing `Z`, so if those disagree, `_iso_le` compares punctuation instead of
    instants. `Z` versus `+00:00` sorts wrong for the *same* instant, which would leave a cut
    reading as open at its exact expiry second -- a cut that never lifts.
    """
    strip = contract_module._strip_us
    canonical = "2026-06-15T12:00:00Z"

    for spelling in (
        "2026-06-15T12:00:00Z",
        "2026-06-15T12:00:00",
        "2026-06-15T12:00:00.123456Z",
        "2026-06-15T12:00:00+00:00",
        "2026-06-15T07:00:00-05:00",
        "2026-06-15T07:00:00.500-05:00",
    ):
        assert strip(spelling) == canonical, spelling
        assert strip(strip(spelling)) == canonical, f"not idempotent: {spelling}"
        assert contract_module._parse_iso(strip(spelling)) is not None, spelling

    # A fractional part must not cost the offset: 12:00:00.500-05:00 is 17:00:00Z.
    assert strip("2026-06-15T12:00:00.500-05:00") == "2026-06-15T17:00:00Z"


def test_window_closed_survives_a_non_z_node_clock(contract_module):
    """The exact inversion this guards, at the exact second it would bite.

    A node reporting `...+00:00` rather than `...Z` is the same instant; the window IS closed at
    the expiry second. The old normaliser returned the `+00:00` form untouched, and `"...Z" >
    "...+00:00"` is True for equal times, so the cut would have stayed open.
    """
    real_now = contract_module._iso_now
    try:
        contract_module._iso_now = lambda: "2026-06-15T12:00:00+00:00"
        assert contract_module.window_closed("2026-06-15T12:00:00Z") is True
        contract_module._iso_now = lambda: "2026-06-15T11:59:59+00:00"
        assert contract_module.window_closed("2026-06-15T12:00:00Z") is False
        contract_module._iso_now = lambda: "2026-06-15T12:00:01+00:00"
        assert contract_module.window_closed("2026-06-15T12:00:00Z") is True
    finally:
        contract_module._iso_now = real_now


def test_a_node_clock_with_a_negative_offset_still_parses(contract_module):
    """A negative offset used to produce `...-05:00Z`, which `_parse_iso` then rejected.

    A contract clock that throws strands the agent behind a cut it can never escape, so the
    normaliser must stay total.
    """
    normalised = contract_module._strip_us("2026-06-15T07:00:00-05:00")
    assert normalised == "2026-06-15T12:00:00Z"
    assert contract_module._parse_iso(normalised).hour == 12


@pytest.mark.parametrize("bad", [0, -5, 3601, 99999])
def test_deploy_time_policy_is_rejected(direct_deploy, bad):
    """An out-of-range default used to be silently replaced with 900.

    Deploying with `--cut-seconds 99999` and getting 15 minutes with no error is the kind of
    misconfiguration nobody finds. It now fails at construction, through the real deploy path --
    constructing the class directly raises on the first storage write regardless, so a direct
    call would have passed for the wrong reason. Parametrised because the harness permits one
    contract load per test.
    """
    from conftest import AGENT, CONTRACT, OBSERVER, OWNER, SDK_VERSION

    with pytest.raises(Exception) as excinfo:
        direct_deploy(
            CONTRACT, owner=OWNER, agent=AGENT, observer=OBSERVER, default_cut_seconds=bad, sdk_version=SDK_VERSION
        )
    assert "1..3600" in str(excinfo.value), f"expected the range error for {bad}"


def test_deploy_time_policy_accepts_the_cap(direct_deploy):
    from conftest import AGENT, CONTRACT, OBSERVER, OWNER, SDK_VERSION

    contract = direct_deploy(
        CONTRACT, owner=OWNER, agent=AGENT, observer=OBSERVER, default_cut_seconds=3600, sdk_version=SDK_VERSION
    )
    assert contract.stats()["default_cut_seconds"] == 3600


def test_deploy_rejects_an_observer_equal_to_the_agent(direct_deploy):
    """Self-attestation must be impossible at the type level, not just discouraged in docs."""
    from conftest import AGENT, CONTRACT, OWNER, SDK_VERSION

    with pytest.raises(Exception) as excinfo:
        direct_deploy(CONTRACT, owner=OWNER, agent=AGENT, observer=AGENT, sdk_version=SDK_VERSION)
    assert "different address" in str(excinfo.value)


def test_deploy_rejects_a_malformed_observer(direct_deploy):
    from conftest import AGENT, CONTRACT, OWNER, SDK_VERSION

    with pytest.raises(Exception) as excinfo:
        direct_deploy(
            CONTRACT, owner=OWNER, agent=AGENT, observer="0x1234", sdk_version=SDK_VERSION
        )
    assert "20-byte address" in str(excinfo.value)


def test_retry_loop_signature_survives_reduction(contract_module):
    """The loop signal is concentration, not volume: 60 of one tool is EXTREME."""
    d = _digest(contract_module, FIXTURES["runaway"]["payload"], AGENT, 10**24)
    assert d["repeat_ratio_band"] == "EXTREME"
    assert d["single_target_share_band"] == "EXTREME"
    assert d["error_ratio_band"] == "EXTREME"
    assert d["distinct_tool_band"] == "ONE"
    assert d["target_fanout_band"] == "ONE"


def test_varied_work_does_not_look_like_a_loop(contract_module):
    """Five varied steps over three tools and three destinations must not band as concentrated."""
    d = _digest(contract_module, FIXTURES["benign"]["payload"], AGENT, 10**21)
    assert d["repeat_ratio_band"] in ("LOW", "MODERATE")
    assert d["single_target_share_band"] in ("LOW", "MODERATE")
    assert d["step_count_band"] == "FEW"


def test_fanout_signature(contract_module):
    d = _digest(contract_module, FIXTURES["fanout"]["payload"], AGENT, 10**21)
    assert d["target_fanout_band"] == "MANY"
    assert d["single_target_share_band"] == "LOW"


def test_agent_identity_is_compared_not_stored(contract_module):
    """A journal naming a different agent reduces to found=True, matches=False.

    The raw agent string must not survive into the digest -- it is attacker controlled, and it
    varies only in case between two fetches of the same document.
    """
    d = _digest(contract_module, FIXTURES["foreign"]["payload"], AGENT, 10**21)
    assert d["journal_found"] is True
    assert d["agent_matches"] is False
    assert "0xdd" not in json.dumps(d)


def test_agent_match_is_case_insensitive(contract_module):
    payload = dict(FIXTURES["benign"]["payload"])
    payload["agent"] = "0x" + AGENT[2:].upper()
    assert _digest(contract_module, payload, AGENT, 10**21)["agent_matches"] is True


def test_no_raw_identifiers_survive_reduction(contract_module):
    """Tool names, destination names and per-step records must be gone.

    This is the property that makes the digest safe to show to consensus at all: the agent
    under scrutiny writes that document, so every identifier in it is an injection vector.
    """
    d = _digest(contract_module, FIXTURES["runaway"]["payload"], AGENT, 10**24)
    blob = json.dumps(d)
    for forbidden in ("api.partner.example", "http.get", "1750000900", "241100", "outcome"):
        assert forbidden not in blob


def test_missing_journal_is_a_verdict_input_not_an_error(contract_module):
    for status in (404, 500, 0):
        d = contract_module.digest_from_response(status, None, AGENT, 10**21)
        assert d["journal_found"] is False
        assert d["note"] == f"HTTP_{status}"


def test_unparseable_body_is_normalised_not_raised(contract_module):
    d = contract_module.digest_from_response(200, b"<html>not json</html>", AGENT, 0)
    assert d["journal_found"] is False
    assert d["note"] == "UNPARSEABLE"


def test_non_object_body_is_normalised(contract_module):
    d = contract_module.digest_from_response(200, b"[1,2,3]", AGENT, 0)
    assert d["journal_found"] is False
    assert d["note"] == "NOT_AN_OBJECT"


def test_junk_steps_do_not_crash_the_reduction(contract_module):
    """A journal full of non-dicts must band to UNKNOWN rather than raise inside a consensus block."""
    d = _digest(contract_module, {"steps": ["nope", 7, None, {"tool": "x"}]}, AGENT, 0)
    assert d["journal_found"] is True
    assert d["spend_fraction_band"] == "UNKNOWN"


def test_hex_and_decimal_spend_parse_identically(contract_module):
    """A journal reporting spend in 0x and in decimal must reduce to the same band."""
    decimal = _digest(contract_module, {"steps": [], "spend": str(10**18)}, AGENT, 0)
    hexed = _digest(contract_module, {"steps": [], "spend": hex(10**18)}, AGENT, 0)
    assert decimal == hexed
    assert decimal["spend_band"] == "SMALL"


def test_spend_fraction_is_measured_against_the_allowance(contract_module):
    journal = {"steps": [], "spend": 5 * 10**20}
    under = _digest(contract_module, journal, AGENT, 10**22)
    over = _digest(contract_module, journal, AGENT, 10**19)
    assert under["spend_fraction_band"] == "LOW"    # 5% of the allowance
    assert over["spend_fraction_band"] == "EXTREME"  # 50x the allowance


# --------------------------------------------------------------------- time helpers


def test_window_closed_is_inclusive_at_the_expiry_second(contract_module):
    """`expires_at <= now` means closed. An inverted comparison here is the worst possible bug."""
    module = contract_module
    real_now = module._iso_now

    module._iso_now = lambda: "2026-06-15T12:00:00Z"
    try:
        assert module.window_closed("2026-06-15T12:00:00Z") is True   # exactly at expiry
        assert module.window_closed("2026-06-15T11:59:59Z") is True   # past
        assert module.window_closed("2026-06-15T12:00:01Z") is False  # still open
    finally:
        module._iso_now = real_now


def test_strip_us_is_idempotent(contract_module):
    """A non-idempotent normaliser turns `...:48Z` into `...:48ZZ` on a second pass."""
    once = contract_module._strip_us("2026-06-15T12:00:48.123456Z")
    assert once == "2026-06-15T12:00:48Z"
    assert contract_module._strip_us(once) == once