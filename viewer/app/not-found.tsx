import Link from "next/link";

export default function NotFound() {
  return (
    <section className="hero compact">
      <div className="wrap">
        <span className="kicker">404</span>
        <h1>No case at this address.</h1>
        <p className="lede">
          The page does not exist. The contract does. Start from the live board or read how the
          breaker works.
        </p>
        <div className="cta-row">
          <Link className="btn btn-primary" href="/live">
            Live board
          </Link>
          <Link className="btn btn-ghost" href="/how">
            How it works
          </Link>
        </div>
      </div>
    </section>
  );
}
