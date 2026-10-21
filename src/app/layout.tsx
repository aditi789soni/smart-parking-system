import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/context/UserContext";
import Navbar from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ParkSmart Pro | Smart Parking Slot Reservation & Gate Simulator",
  description:
    "End-to-end full-stack smart parking slot reservation system with real-time slot occupancy grid, QR code access passes, automated 15-minute grace period enforcement, and barrier simulator.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-sky-500 selection:text-white">
        <UserProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-slate-800/80 bg-slate-950/60 py-6 text-center text-xs text-slate-500">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p>© 2026 ParkSmart Pro — IoT Smart Parking & Barrier Verification Suite</p>
              <div className="flex items-center gap-4 text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span> SQLite + Prisma ORM
                </span>
                <span>•</span>
                <span>Next.js App Router</span>
                <span>•</span>
                <span>ACID Transactions</span>
              </div>
            </div>
          </footer>
        </UserProvider>
      </body>
    </html>
  );
}
