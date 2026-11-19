import { useState } from "react";
import { AlertTriangle, ImageOff, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate, initials } from "@/lib/format";
import type { AdminAccountRow, AdminIdDocuments } from "@/lib/types";

interface CustomerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: AdminAccountRow | null;
  /** Optional verification documents loaded by the dashboard. */
  documents?: AdminIdDocuments | null;
  documentsLoading?: boolean;
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800",
  pending: "bg-amber-100 text-amber-800",
  removed: "bg-gray-200 text-gray-700",
  banned: "bg-red-100 text-red-700",
  rejected: "bg-rose-100 text-rose-700",
};

/** Absolute API URLs are rendered same-origin so the session cookie is sent. */
function sameOriginPath(url: string): string {
  if (!url) return "";
  if (url.startsWith("/")) return url;
  try {
    const parsed = new URL(url, window.location.origin);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

function DocumentThumb({ label, url }: { label: string; url?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="space-y-1.5">
      <span className="text-[11px] font-bold text-gray-600">{label}</span>
      <div className="h-36 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center">
        {url && !failed ? (
          <img
            src={sameOriginPath(url)}
            alt={label}
            className="w-full h-full object-contain bg-white"
            loading="lazy"
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-gray-400">
            <ImageOff className="w-6 h-6" />
            <span className="text-[10px] font-bold">
              {failed ? "Could not load" : "Not uploaded"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function CustomerDetailsModal({
  isOpen,
  onClose,
  customer,
  documents = null,
  documentsLoading = false,
}: CustomerDetailsModalProps) {
  if (!isOpen || !customer) return null;

  const docs = documents?.documents ?? [];
  const front = docs.find((doc) => doc.type === "id_front") ?? docs[0];
  const back = docs.find((doc) => doc.type === "id_back") ?? docs[1];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans"
      role="dialog"
      aria-modal="true"
      aria-label="Customer details"
    >
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#3087C5] text-white flex items-center justify-center shadow-xs">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-gray-900 text-base">Customer Details</h3>
              <p className="text-xs font-bold text-[#3087C5]">
                ID: {customer.customerNo || "Not assigned"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close customer details"
            className="w-8 h-8 rounded-full bg-gray-200/80 hover:bg-gray-300 text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* User Profile Summary */}
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-5 bg-gray-50 p-4 rounded-2xl border border-gray-200">
            <div className="w-24 h-24 rounded-2xl bg-white overflow-hidden border border-gray-200 shrink-0">
              {customer.profilePhoto ? (
                <img
                  src={customer.profilePhoto}
                  alt={customer.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-sky-50 text-[#3087C5] flex items-center justify-center text-2xl font-black">
                  {initials(customer.name)}
                </div>
              )}
            </div>
            <div className="space-y-1 text-center sm:text-left min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h4 className="font-black text-gray-900 text-lg">{customer.name}</h4>
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                    STATUS_STYLES[customer.status] ?? "bg-gray-100 text-gray-600"
                  }`}
                >
                  {customer.status}
                </span>
              </div>
              <p className="text-xs font-semibold text-gray-600">
                Email: <span className="text-gray-900">{customer.email || "—"}</span>
              </p>
              <p className="text-xs font-semibold text-gray-600">
                Phone: <span className="text-gray-900">{customer.phone || "—"}</span>
              </p>
              <p className="text-xs font-semibold text-gray-600">
                Address: <span className="text-gray-900">{customer.address || "—"}</span>
              </p>
              <div className="pt-1 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="text-xs font-bold text-gray-500">
                  Gender: {customer.gender || "—"}
                </span>
                <span className="text-gray-300">•</span>
                <span className="text-xs font-bold text-gray-500">
                  Birthday: {formatDate(customer.birthday) || "—"}
                </span>
                <span className="text-gray-300">•</span>
                <span className="text-xs font-bold text-gray-500">
                  Joined: {formatDate(customer.createdAt) || "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Bad Records Counter (Limit 2) */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <h5 className="text-xs font-black text-amber-900 uppercase">
                  Didn't Claimed Records
                </h5>
                <p className="text-xs text-amber-700 font-semibold">
                  Two unclaimed orders cause an automatic account ban.
                </p>
              </div>
            </div>
            <span
              className={`text-base font-black px-3 py-1 rounded-full shrink-0 ${
                customer.badRecords >= 2
                  ? "bg-red-600 text-white"
                  : "bg-amber-200 text-amber-900"
              }`}
            >
              {customer.badRecords}/2
            </span>
          </div>

          {/* Uploaded Verification IDs */}
          <div className="space-y-2">
            <h5 className="text-xs font-black uppercase text-gray-500 tracking-wider">
              Verification IDs
            </h5>
            {documentsLoading ? (
              <div className="h-36 rounded-xl border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-xs font-semibold text-gray-500">
                Loading ID documents…
              </div>
            ) : docs.length === 0 ? (
              <div className="h-36 rounded-xl border border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center gap-1 text-gray-400">
                <ImageOff className="w-7 h-7" />
                <span className="text-[11px] font-bold">No ID documents on file</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DocumentThumb label="Valid ID 1 (Front)" url={front?.url} />
                <DocumentThumb label="Valid ID 2 (Back)" url={back?.url} />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <Button variant="primary" size="md" onClick={onClose} className="rounded-full px-6">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
