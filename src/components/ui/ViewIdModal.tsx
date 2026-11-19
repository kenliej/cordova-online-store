import { useState } from "react";
import { FileWarning, ImageOff, Loader2, RefreshCw, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AdminIdDocuments } from "@/lib/types";

interface ViewIdModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountName: string;
  /** Result of `GET /admin/accounts/{id}/id-documents` (null while loading). */
  documents: AdminIdDocuments | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  id_front: "Valid ID 1 — Front",
  id_back: "Valid ID 2 — Back",
};

/**
 * The ID-document endpoints return absolute URLs. In dev the browser talks to
 * the Vite origin while Laravel lives on :8000, so an absolute cross-origin URL
 * would drop the SameSite session cookie. Render the same-origin path so the
 * dev proxy forwards the request with the Sanctum cookie attached.
 */
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

function IdDocumentPreview({
  label,
  url,
  originalName,
}: {
  label: string;
  url?: string;
  originalName?: string;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="space-y-2 min-w-0">
      <span className="text-xs font-bold text-gray-700 block">{label}</span>
      <div className="h-48 rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center">
        {url && !failed ? (
          <img
            src={sameOriginPath(url)}
            alt={label}
            className="w-full h-full object-contain bg-white"
            loading="lazy"
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="flex flex-col items-center gap-1.5 px-4 text-center text-gray-400">
            <ImageOff className="w-8 h-8" />
            <span className="text-[11px] font-bold">
              {failed ? "This document could not be loaded." : "Document not uploaded."}
            </span>
          </div>
        )}
      </div>
      <p className="text-[11px] font-semibold text-gray-500 truncate">
        {originalName ? originalName : url ? "Uploaded document" : "No file on record"}
      </p>
    </div>
  );
}

export function ViewIdModal({
  isOpen,
  onClose,
  accountName,
  documents,
  loading = false,
  error = null,
  onRetry,
}: ViewIdModalProps) {
  if (!isOpen) return null;

  const docs = documents?.documents ?? [];
  const front = docs.find((doc) => doc.type === "id_front") ?? docs[0];
  const back = docs.find((doc) => doc.type === "id_back") ?? docs[1];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans"
      role="dialog"
      aria-modal="true"
      aria-label="Verification IDs"
    >
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#3087C5] text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-gray-900 text-base">Verification IDs</h3>
              <p className="text-xs font-bold text-[#3087C5]">{accountName || "Pending account"}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close verification IDs"
            className="w-8 h-8 rounded-full bg-gray-200/80 hover:bg-gray-300 text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin text-[#3087C5]" />
              <span className="text-sm font-semibold">Loading ID documents…</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-8 text-center">
              <FileWarning className="w-8 h-8 text-rose-500" />
              <p className="text-sm font-semibold text-rose-800">{error}</p>
              {onRetry && (
                <Button variant="white" size="sm" onClick={onRetry} className="rounded-full border-rose-200 text-rose-700">
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Try Again</span>
                </Button>
              )}
            </div>
          ) : docs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-12 text-center">
              <ImageOff className="w-10 h-10 text-gray-400" />
              <p className="text-sm font-black text-gray-800">No ID documents on file</p>
              <p className="text-xs font-medium text-gray-500">
                This account has not uploaded verification IDs yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <IdDocumentPreview
                label={front ? TYPE_LABELS[front.type] ?? "Valid ID 1" : "Valid ID 1 (Front)"}
                url={front?.url}
                originalName={front?.originalName}
              />
              <IdDocumentPreview
                label={back ? TYPE_LABELS[back.type] ?? "Valid ID 2" : "Valid ID 2 (Back)"}
                url={back?.url}
                originalName={back?.originalName}
              />
            </div>
          )}
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
