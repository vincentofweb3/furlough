import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { WalletProvider } from "@/components/WalletProvider";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: {
    default: "Furlough - a circuit breaker for autonomous AI agents",
    template: "%s - Furlough",
  },
  description:
    "Furlough is a GenLayer Intelligent Contract that adjudicates an AI agent's own telemetry and cuts its spend allowance by validator consensus, until a deadline that expires on its own.",
  openGraph: {
    title: "Furlough - a circuit breaker for autonomous AI agents",
    description: "The cut is performed by consensus. The lift is performed by a clock.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href={`${basePath}/favicon.svg`} type="image/svg+xml" />
      </head>
      <body>
        <WalletProvider>
          <Header />
          <main>{children}</main>
          <Footer />
        </WalletProvider>
      </body>
    </html>
  );
}
