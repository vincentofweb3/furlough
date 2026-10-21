import Link from "next/link";
import { CONTRACT, EXPLORER, shortAddress } from "@/lib/contract";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="cols">
          <div>
            <h4>Furlough</h4>
            <p className="small">
              An adjudicated circuit breaker for autonomous AI agents, built as a GenLayer
              Intelligent Contract.
            </p>
          </div>
          <div>
            <h4>Live</h4>
            <Link href="/live">Status board</Link>
            <Link href="/report">File a case</Link>
            <Link href="/verify">Contract and evidence</Link>
            <a href={EXPLORER} target="_blank" rel="noopener noreferrer">
              Studio explorer
            </a>
          </div>
          <div>
            <h4>Docs</h4>
            <a
              href="https://github.com/vincentofweb3/furlough#readme"
              target="_blank"
              rel="noopener noreferrer"
            >
              README
            </a>
            <a
              href="https://github.com/vincentofweb3/furlough/blob/master/docs/CONSENSUS.md"
              target="_blank"
              rel="noopener noreferrer"
            >
              Safety argument
            </a>
            <a
              href="https://github.com/vincentofweb3/furlough/blob/master/docs/SPEC.md"
              target="_blank"
              rel="noopener noreferrer"
            >
              Specification
            </a>
            <Link href="/owner">Owner console</Link>
          </div>
          <div>
            <h4>Contract</h4>
            <a href={EXPLORER} target="_blank" rel="noopener noreferrer">
              <code>{shortAddress(CONTRACT)}</code>
            </a>
            <a
              href="https://github.com/vincentofweb3/furlough/blob/master/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
            >
              MIT licence
            </a>
            <span className="small">Studionet, chain 61999</span>
          </div>
        </div>
        <div className="fine">
          Not audited. Testnet only - do not use with real value. Reads are free and need no
          wallet. Writes are signed by your browser wallet; the site never sees a private key.
        </div>
      </div>
    </footer>
  );
}
