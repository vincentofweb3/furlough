"""Known-answer tests for the in-contract secp256k1 verifier.

The SDK has no ecrecover, so the contract implements ECDSA itself. A pure-Python curve
implementation is exactly the kind of code that can look right and accept the wrong thing:
malleable high-s signatures, a point not on the curve, or a digest that does not match. These
tests pin a known-good vector and the rejection boundaries directly.

The deterministic envelope tests prove the *binding*; this file proves the primitive beneath it.
"""

from eth_utils import keccak

# Generated once with eth_account and embedded so the test has no dependency on the signer at
# run time. The message, digest, public key and signature are fixed inputs.
MESSAGE = b"furlough/journal@3 known-answer vector"
ADDRESS = "0x17c5185167401eD00cF5F5b2fc97D9BBfDb7D025"
PUBKEY = bytes.fromhex(
    "24653eac434488002cc06bbfb7f10fe18991e35f9fe4302dbea6d2353dc0ab1c"
    "119fc5009a032aa9fe47f5e149bb8442f71f884ccb516590686d8ff6ab91c613"
)
DIGEST = bytes.fromhex("028ecc2832e5923c76ff11e5e982e61e77f68167abb1e258ce6ab904611574d4")
SIGNATURE = bytes.fromhex(
    "5bc31b2e899f2a2cd05d9cdd1b021257c3310e48c4d0ee17c7098644ea865a99"
    "677835f75a15de81361278aa9fcce0bef1abe66b8b97c55f59fadf63eef97562"
    "1b"
)
SECP_N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141


def test_known_answer_vector_is_accepted(contract_module):
    assert keccak(MESSAGE) == DIGEST
    assert contract_module._pubkey_address(PUBKEY) == ADDRESS.lower()
    assert contract_module._ecdsa_verify(PUBKEY, DIGEST, SIGNATURE) is True
    assert contract_module._ecdsa_verify(b"\x04" + PUBKEY, DIGEST, SIGNATURE) is True


def test_changed_digest_is_rejected(contract_module):
    assert contract_module._ecdsa_verify(PUBKEY, keccak(b"different message"), SIGNATURE) is False


def test_high_s_twin_is_rejected(contract_module):
    """Ethereum accepts the high-s twin; this contract deliberately does not.

    Accepting both spellings would make a signed envelope malleable after the fact. The
    canonical message is still the same, but a rewritten signature must not be a second valid
    authorisation for the same filing.
    """
    r = SIGNATURE[:32]
    s = int.from_bytes(SIGNATURE[32:64], "big")
    high_s = SECP_N - s
    high_signature = r + high_s.to_bytes(32, "big") + bytes([28])
    assert contract_module._ecdsa_verify(PUBKEY, DIGEST, high_signature) is False


def test_zero_and_out_of_range_scalars_are_rejected(contract_module):
    zero = bytes(65)
    assert contract_module._ecdsa_verify(PUBKEY, DIGEST, zero) is False

    bad_s = SIGNATURE[:32] + bytes(32) + SIGNATURE[64:]
    assert contract_module._ecdsa_verify(PUBKEY, DIGEST, bad_s) is False

    bad_v = SIGNATURE[:64] + bytes([2])
    assert contract_module._ecdsa_verify(PUBKEY, DIGEST, bad_v) is False


def test_malformed_lengths_are_rejected(contract_module):
    assert contract_module._ecdsa_verify(PUBKEY, DIGEST, SIGNATURE[:-1]) is False
    assert contract_module._ecdsa_verify(PUBKEY, DIGEST[:-1], SIGNATURE) is False
    assert contract_module._ecdsa_verify(PUBKEY[:-1], DIGEST, SIGNATURE) is False
    assert contract_module._ecdsa_verify(b"", DIGEST, SIGNATURE) is False


def test_point_off_the_curve_is_rejected(contract_module):
    off_curve = bytes.fromhex("00" * 32 + "01" * 32)
    assert contract_module._ecdsa_verify(off_curve, DIGEST, SIGNATURE) is False


def test_pubkey_address_is_the_last_20_bytes_of_keccak(contract_module):
    assert contract_module._pubkey_address(PUBKEY) == "0x" + keccak(PUBKEY).hex()[-40:]
