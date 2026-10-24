"""Evidence must be signed by the bound observer and describe the bound agent.

The reporter chooses the URL, so without a signature a stranger can publish any document
they like and ask validators to cut someone else's allowance. These tests exercise every
binding in the envelope: observer signer, subject agent, contract, chain, case, claim, URL
and journal bytes. The agent's own spending key is deliberately not sufficient.
"""

import json

from conftest import AGENT, open_case
from fixtures import (
    AGENT_KEY,
    FOREIGN_AGENT,
    FOREIGN_KEY,
    FIXTURES,
    OBSERVER,
    signed_envelope,
)


def _url(case_name: str, case_id: str) -> str:
    return f"https://journal.test/case/{case_id}/{case_name}"


def _assert_no_cut(case):
    assert case.verdict == "INSUFFICIENT_EVIDENCE"
    assert case.cut is False
    assert case.digest.authenticated is False
    assert case.digest.journal_found is False


def test_a_genuine_observer_signature_is_recorded(breaker, direct_vm):
    open_case(breaker, direct_vm, "runaway")
    case = breaker.get_case("runaway")
    assert breaker.stats()["observer"] == OBSERVER
    assert case.digest.authenticated is True
    assert case.digest.journal_found is True
    assert case.digest.agent_matches is True
    assert case.verdict == "CONFIRMED_MISBEHAVIOR"


def test_agent_spending_key_cannot_self_attest(breaker, direct_vm):
    """The key that spends is not the key that signs telemetry.

    A valid signature from the bound agent over the correct canonical message still fails,
    because the envelope must be signed by the separately-bound observer.
    """
    case_id = "self-attested"
    body = signed_envelope(
        direct_vm._contract_address,
        direct_vm._chain_id,
        case_id,
        FIXTURES["runaway"]["claim"],
        _url("runaway", case_id),
        FIXTURES["runaway"]["payload"],
        signer_key=AGENT_KEY,
        envelope_agent=AGENT,
        envelope_observer=OBSERVER,
    )
    open_case(breaker, direct_vm, "runaway", case_id=case_id, body=body)
    _assert_no_cut(breaker.get_case(case_id))


def test_unsigned_reporter_document_cannot_cut(breaker, direct_vm):
    """The original vulnerability: a reporter-chosen journal with no signer."""
    claim = FIXTURES["runaway"]["claim"]
    body = json.dumps(FIXTURES["runaway"]["payload"])
    open_case(
        breaker,
        direct_vm,
        "runaway",
        case_id="unsigned",
        claim=claim,
        body=body,
    )
    _assert_no_cut(breaker.get_case("unsigned"))
    assert not direct_vm._llm_mocks_hit, "unauthenticated evidence must not reach the model"


def test_a_wrong_signer_cannot_cut(breaker, direct_vm):
    case_id = "wrong-signer"
    url = _url("runaway", case_id)
    body = signed_envelope(
        direct_vm._contract_address,
        direct_vm._chain_id,
        case_id,
        FIXTURES["runaway"]["claim"],
        url,
        FIXTURES["runaway"]["payload"],
        signer_key=FOREIGN_KEY,
        envelope_agent=AGENT,
        envelope_observer=OBSERVER,
    )
    open_case(breaker, direct_vm, "runaway", case_id=case_id, body=body)
    _assert_no_cut(breaker.get_case(case_id))


def test_observer_envelope_field_must_match(breaker, direct_vm):
    case_id = "observer-field"
    body = signed_envelope(
        direct_vm._contract_address,
        direct_vm._chain_id,
        case_id,
        FIXTURES["runaway"]["claim"],
        _url("runaway", case_id),
        FIXTURES["runaway"]["payload"],
        envelope_agent=AGENT,
        envelope_observer=FOREIGN_AGENT,
    )
    open_case(breaker, direct_vm, "runaway", case_id=case_id, body=body)
    _assert_no_cut(breaker.get_case(case_id))


def test_tampered_journal_bytes_cannot_cut(breaker, direct_vm):
    case_id = "tampered"
    url = _url("runaway", case_id)
    envelope = json.loads(
        signed_envelope(
            direct_vm._contract_address,
            direct_vm._chain_id,
            case_id,
            FIXTURES["runaway"]["claim"],
            url,
            FIXTURES["runaway"]["payload"],
        )
    )
    envelope["journal"] = json.dumps(
        {"agent": AGENT, "steps": [], "spend": 0}, sort_keys=True, separators=(",", ":")
    )
    open_case(breaker, direct_vm, "runaway", case_id=case_id, body=json.dumps(envelope))
    _assert_no_cut(breaker.get_case(case_id))


def test_a_signature_is_bound_to_the_contract(breaker, direct_vm):
    case_id = "contract-bound"
    body = signed_envelope(
        "0x" + "42" * 20,
        direct_vm._chain_id,
        case_id,
        FIXTURES["runaway"]["claim"],
        _url("runaway", case_id),
        FIXTURES["runaway"]["payload"],
    )
    open_case(breaker, direct_vm, "runaway", case_id=case_id, body=body)
    _assert_no_cut(breaker.get_case(case_id))


def test_a_signature_is_bound_to_the_chain(breaker, direct_vm):
    case_id = "chain-bound"
    body = signed_envelope(
        direct_vm._contract_address,
        int(direct_vm._chain_id) + 1,
        case_id,
        FIXTURES["runaway"]["claim"],
        _url("runaway", case_id),
        FIXTURES["runaway"]["payload"],
    )
    open_case(breaker, direct_vm, "runaway", case_id=case_id, body=body)
    _assert_no_cut(breaker.get_case(case_id))


def test_a_signature_is_bound_to_the_case_id(breaker, direct_vm):
    case_id = "replay"
    body = signed_envelope(
        direct_vm._contract_address,
        direct_vm._chain_id,
        "some-other-case",
        FIXTURES["runaway"]["claim"],
        _url("runaway", case_id),
        FIXTURES["runaway"]["payload"],
    )
    open_case(breaker, direct_vm, "runaway", case_id=case_id, body=body)
    _assert_no_cut(breaker.get_case(case_id))


def test_a_signature_is_bound_to_the_claim(breaker, direct_vm):
    case_id = "claim-bound"
    body = signed_envelope(
        direct_vm._contract_address,
        direct_vm._chain_id,
        case_id,
        "the claim the observer actually signed",
        _url("runaway", case_id),
        FIXTURES["runaway"]["payload"],
    )
    open_case(
        breaker,
        direct_vm,
        "runaway",
        case_id=case_id,
        claim="a different claim chosen by the reporter",
        body=body,
    )
    _assert_no_cut(breaker.get_case(case_id))


def test_a_signature_is_bound_to_the_journal_url(breaker, direct_vm):
    case_id = "url-bound"
    body = signed_envelope(
        direct_vm._contract_address,
        direct_vm._chain_id,
        case_id,
        FIXTURES["runaway"]["claim"],
        "https://journal.test/case/somewhere-else/runaway",
        FIXTURES["runaway"]["payload"],
    )
    open_case(breaker, direct_vm, "runaway", case_id=case_id, body=body)
    _assert_no_cut(breaker.get_case(case_id))


def test_malformed_pubkey_is_rejected(breaker, direct_vm):
    case_id = "bad-pubkey"
    envelope = json.loads(
        signed_envelope(
            direct_vm._contract_address,
            direct_vm._chain_id,
            case_id,
            FIXTURES["runaway"]["claim"],
            _url("runaway", case_id),
            FIXTURES["runaway"]["payload"],
        )
    )
    envelope["pubkey"] = "0x04" + "00" * 32
    open_case(breaker, direct_vm, "runaway", case_id=case_id, body=json.dumps(envelope))
    _assert_no_cut(breaker.get_case(case_id))


def test_malformed_signature_is_rejected(breaker, direct_vm):
    case_id = "bad-signature"
    envelope = json.loads(
        signed_envelope(
            direct_vm._contract_address,
            direct_vm._chain_id,
            case_id,
            FIXTURES["runaway"]["claim"],
            _url("runaway", case_id),
            FIXTURES["runaway"]["payload"],
        )
    )
    envelope["signature"] = "0x" + "00" * 65
    open_case(breaker, direct_vm, "runaway", case_id=case_id, body=json.dumps(envelope))
    _assert_no_cut(breaker.get_case(case_id))


def test_a_foreign_journal_signed_by_the_observer_is_not_evidence_about_this_agent(
    breaker, direct_vm
):
    open_case(breaker, direct_vm, "foreign")
    case = breaker.get_case("foreign")
    assert case.digest.authenticated is True
    assert case.digest.agent_matches is False
    assert case.verdict == "INSUFFICIENT_EVIDENCE"
    assert case.cut is False
    assert direct_vm._llm_mocks_hit == set(), "a foreign journal must not reach the model"


def test_unreachable_journal_is_never_authenticated(breaker, direct_vm):
    open_case(breaker, direct_vm, "unreachable")
    case = breaker.get_case("unreachable")
    assert case.digest.authenticated is False
    assert case.digest.journal_found is False
    assert case.verdict == "INSUFFICIENT_EVIDENCE"


def test_any_reporter_may_still_file_with_genuine_evidence(breaker, direct_vm):
    open_case(breaker, direct_vm, "runaway", case_id="stranger", sender="0x" + "99" * 20)
    case = breaker.get_case("stranger")
    assert case.reporter == "0x" + "99" * 20
    assert case.verdict == "CONFIRMED_MISBEHAVIOR"
    assert case.digest.authenticated is True
