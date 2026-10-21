import type { Metadata } from "next";
import Link from "next/link";
import StatusBoard from "@/components/StatusBoard";
import { CONTRACT, EXPLORER, shortAddress } from "@/lib/contract";

export const metadata: Metadata = {
  title: "Live status board",
  description:
    "Live status of the Furlough adjudicated circuit breaker on GenLayer Studionet: allowance, cut window, and the public case record.",
};

export default function LivePage() {
  return (
    <>
      <section className="hero tight">
        <div className="wrap">
          <span className="kicker">Live - Studionet</span>
          <h1 className="page-title">The breaker, right now.</h1>
          <p className="lede">
            Every field on this page is a free read against the deployed contract. Refreshes every 15
            seconds. No wallet, no API key, no backend.
          </p>
          <div className="chips">
            <span className="chip">Studionet - chain 61999</span>
            <span className="chip">reads need no wallet</span>
            <a className="chip" href={EXPLORER} target="_blank" rel="noopener noreferrer">
              {shortAddress(CONTRACT)}
            </a>
            <Link className="chip" href="/verify">
              evidence and addresses
            </Link>
            <Link className="chip" href="/report">
              file a case
            </Link>
          </div>
        </div>
      </section>

      <section className="pt-0">
        <div className="wrap">
          <StatusBoard />
        </div>
      </section>
    </>
  );
}
