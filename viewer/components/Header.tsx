"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import WalletButton from "./WalletButton";

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/how", label: "How it works" },
  { href: "/live", label: "Live board" },
  { href: "/verify", label: "Verify" },
  { href: "/report", label: "File a case" },
];

export default function Header() {
  const pathname = usePathname();
  const here = pathname.replace(/\/$/, "") || "/";

  return (
    <header className="site-header">
      <div className="wrap">
        <Link className="brand" href="/">
          <svg width="20" height="20" viewBox="0 0 64 64" fill="none" aria-hidden="true">
            <rect width="64" height="64" rx="14" fill="#11161f" />
            <path d="M36 8 20 36h10l-4 20 20-30H35l1-18Z" fill="#6f9bff" />
          </svg>
          Furlough
        </Link>
        <nav className="site-nav" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${here === item.href ? "here" : ""}${item.href === "/report" ? " nav-cta" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="wallet-slot">
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
