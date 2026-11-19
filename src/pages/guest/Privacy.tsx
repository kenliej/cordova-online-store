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

export default function Privacy() {
  return (
    <LegalShell title="Privacy Policy">
      <p>
        Online Mall Cordova collects the information you submit during registration — your name, contact
        details, birthday, address, profile photo and two government-issued IDs — solely to verify your
        identity and operate your account.
      </p>
      <p>
        ID documents are stored privately and are only accessible to you and authorised mall staff for
        verification purposes. They are never published and are deleted when no longer required.
      </p>
      <p>
        Passwords are stored using strong one-way hashing. Your session is protected with an HTTP-only
        cookie; we never store authentication tokens in browser storage. To exercise your data rights,
        contact the mall through the Contact Us page.
      </p>
    </LegalShell>
  );
}
