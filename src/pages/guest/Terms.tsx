import type { ReactNode } from "react";
import { Link } from "react-router";

const LAST_UPDATED = "November 20, 2026";

function LegalShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="mx-auto max-w-3xl rounded-3xl border border-gray-200 bg-white p-6 sm:p-10 shadow-sm">
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900">{title}</h1>
        <p className="text-xs font-semibold text-gray-400 mt-1">Last updated: {LAST_UPDATED}</p>
        <div className="mt-6 space-y-4 text-sm leading-relaxed text-gray-600">{children}</div>
        <Link
          to="/register"
          className="mt-8 inline-flex text-sm font-bold text-[#3087C5] hover:underline"
        >
          ← Back to registration
        </Link>
      </div>
    </div>
  );
}

export default function Terms() {
  return (
    <LegalShell title="Terms of Service">
      <p>
        Welcome to Online Mall Cordova. By creating an account you agree to provide truthful personal
        information, including two valid government-issued IDs for verification.
      </p>
      <p>
        Accounts are reviewed by mall staff before activation. You must be at least 18 years old to
        register. Orders must be claimed at the Online Mall Cordova pickup counter within three (3) days
        of being marked ready; unclaimed orders are recorded against your account and two such records
        result in an automatic ban.
      </p>
      <p>
        Payments are made in person at the mall pickup counter. Online Mall Cordova reserves the right to
        cancel orders that violate these terms or applicable law.
      </p>
    </LegalShell>
  );
}
