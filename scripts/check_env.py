#!/usr/bin/env python3.12
"""Environment check for the Furlough hermetic gate.

    python3.12 scripts/check_env.py

Verifies that the pinned GenVM bundle resolves to a runner whose standard library actually
provides ``genlayer.gl``, and reports the remedy when it does not.

Why this exists
---------------
``gltest`` picks a py-genlayer runner by taking the lexicographically last one it finds, either
in the cached tarball or already extracted under ``~/.cache/gltest-direct/extracted/``. Running
``genvm-lint check`` extracts a *newer, incompatible* runner into that same directory. After
that, the suite fails with::

    ImportError: cannot import name 'gl' from 'genlayer'

which looks exactly like a broken contract and is not one. ``SDK_VERSION`` in
``tests/direct/conftest.py`` pins the bundle *version* but does not pin the runner *hash*, so it
does not prevent this on its own.

Exit code 0 means the gate should run. 1 means follow the printed remedy: ``--fetch`` on a
fresh machine, ``--fix`` for a polluted cache.
"""

import argparse
import hashlib
import json
import shutil
import sys
import urllib.request
from pathlib import Path

CACHE = Path.home() / ".cache" / "gltest-direct"
EXTRACTED = CACHE / "extracted"

# genlayer-test 0.29.2 hard-codes genvm-universal.tar.xz from the v0.3.0-rc7 release, and
# upstream re-cut that release without the asset. The mirror is byte-identical and pinned.
BUNDLE_SHA256 = {
    "v0.3.0-rc7": "e218a1854214681560351051f76fe2b878545cf3409455ef372d57014a88ca67",
}
MIRROR = (
    "https://github.com/vincentofweb3/furlough/releases/download/"
    "genvm-sdk-{version}/genvm-universal-{version}.tar.xz"
)


def pinned_version() -> str:
    conftest = Path(__file__).resolve().parent.parent / "tests" / "direct" / "conftest.py"
    for line in conftest.read_text().splitlines():
        if line.startswith("SDK_VERSION"):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    return ""


def runners(version: str) -> dict:
    base = EXTRACTED / version / "py-genlayer"
    return {p.name: p for p in base.iterdir() if p.is_dir()} if base.exists() else {}


def std_for(runner: Path) -> str | None:
    manifest = runner / "runner.json"
    if not manifest.exists():
        return None
    try:
        seq = json.loads(manifest.read_text()).get("Seq", [])
    except ValueError:
        return None
    for step in seq:
        depends = step.get("Depends", "") if isinstance(step, dict) else ""
        if depends.startswith("py-lib-genlayer-std:"):
            return depends.split(":", 1)[1]
    return None


def has_gl(version: str, std_hash: str) -> bool:
    return (EXTRACTED / version / "py-lib-genlayer-std" / std_hash / "genlayer" / "gl").exists()


def fetch_bundle(version: str) -> int:
    """Download the pinned bundle from the repository mirror, verifying a pinned digest."""
    expected = BUNDLE_SHA256.get(version)
    if not expected:
        print(f"no pinned sha256 for {version}; refusing to fetch unverified bytes")
        return 1

    url = MIRROR.format(version=version)
    target = CACHE / f"genvm-universal-{version}.tar.xz"
    partial = target.with_name(target.name + ".part")
    CACHE.mkdir(parents=True, exist_ok=True)

    print(f"fetching {url}")
    digest = hashlib.sha256()
    try:
        with urllib.request.urlopen(url, timeout=60) as response, open(partial, "wb") as out:
            while chunk := response.read(1 << 20):
                digest.update(chunk)
                out.write(chunk)
    except OSError as exc:
        partial.unlink(missing_ok=True)
        print(f"download failed: {exc}")
        return 1

    if digest.hexdigest() != expected:
        partial.unlink(missing_ok=True)
        print(f"sha256 mismatch: got {digest.hexdigest()}, expected {expected}")
        return 1

    partial.replace(target)
    print(f"saved    {target} ({target.stat().st_size:,} bytes, sha256 verified)")
    return 0


def broken(version: str) -> list:
    """Runners whose standard library is absent or does not provide `genlayer.gl`."""
    out = []
    for name, path in sorted(runners(version).items()):
        std = std_for(path)
        if std is None or not has_gl(version, std):
            out.append((name, std))
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--fix",
        action="store_true",
        help="Move unusable runner directories aside instead of only reporting them",
    )
    parser.add_argument(
        "--fetch",
        action="store_true",
        help="Download the pinned GenVM bundle from the repository mirror if it is missing",
    )
    args = parser.parse_args()

    version = pinned_version()
    if not version:
        print("could not read SDK_VERSION from tests/direct/conftest.py")
        return 1

    print(f"cache    {CACHE}")
    print(f"pinned   {version}")

    bundle = CACHE / f"genvm-universal-{version}.tar.xz"
    if not bundle.exists():
        if args.fetch:
            code = fetch_bundle(version)
            if code:
                return code
        else:
            print(f"\npinned bundle not cached: {bundle.name}")
            print("upstream removed the tarball that genlayer-test 0.29.2 requests; fetch the mirror:")
            print(f"  python3.12 {sys.argv[0]} --fetch")
            return 1

    if not EXTRACTED.exists():
        print("\nno extracted bundle yet -- run the suite once to populate it")
        return 1

    good = [n for n, p in sorted(runners(version).items()) if std_for(p) and has_gl(version, std_for(p))]
    bad = broken(version)

    print(f"runners  {len(good)} usable, {len(bad)} unusable")
    for name, std in bad:
        print(f"  unusable  {name[:12]}…  std={'(none)' if not std else std[:12] + '…'}")

    if not bad:
        print("\nOK. `python3.12 -m pytest -q` should pass.")
        return 0

    if not good:
        print("\nno usable runner. Delete the cache and let the suite re-extract:")
        print(f"  rm -rf {EXTRACTED / version}")
        return 1

    if args.fix:
        # Move it OUT of the runner directory entirely. Renaming in place is not enough:
        # gltest picks `sorted(dir.iterdir(), reverse=True)[0]`, and an "unusable-" prefix
        # sorts *above* a hash, so the broken runner would still win.
        quarantine = EXTRACTED / version / "unusable-runners"
        quarantine.mkdir(exist_ok=True)
        for name, _ in bad:
            src = EXTRACTED / version / "py-genlayer" / name
            dst = quarantine / name
            if dst.exists():
                shutil.rmtree(dst)
            shutil.move(str(src), str(dst))
            print(f"  quarantined {name[:12]}… -> {dst}")
        print("\nRe-run `python3.12 -m pytest -q`.")
        return 0

    print("\nThese are almost certainly left behind by `genvm-lint check`. Remedy:")
    print(f"  python3.12 {sys.argv[0]} --fix")
    print(f"or manually: rm -rf {EXTRACTED / version}/py-genlayer/<hash>")
    print("\nOnly one runner can be picked at a time, and gltest picks the newest, so the")
    print("unusable one wins unless it is removed.")
    return 1


if __name__ == "__main__":
    sys.exit(main())