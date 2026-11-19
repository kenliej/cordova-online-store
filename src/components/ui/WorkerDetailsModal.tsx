import { HardHat, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate, initials } from "@/lib/format";
import type { AdminAccountRow } from "@/lib/types";

interface WorkerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  worker: AdminAccountRow | null;
  /** Display name of the assigned store (from the admin stores list). */
  storeName?: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800",
  pending: "bg-amber-100 text-amber-800",
  removed: "bg-gray-200 text-gray-700",
  banned: "bg-red-100 text-red-700",
  rejected: "bg-rose-100 text-rose-700",
};

export function WorkerDetailsModal({
  isOpen,
  onClose,
  worker,
  storeName = null,
}: WorkerDetailsModalProps) {
  if (!isOpen || !worker) return null;

  const rows: { label: string; value: string }[] = [
    { label: "Email Address", value: worker.email || "—" },
    { label: "Phone Number", value: worker.phone || "—" },
    { label: "Address", value: worker.address || "—" },
    { label: "Gender", value: worker.gender || "—" },
    { label: "Birthday", value: formatDate(worker.birthday) || "—" },
    { label: "Assigned Store", value: storeName || (worker.storeId ? `Store #${worker.storeId}` : "Not assigned") },
    { label: "Date Created", value: formatDate(worker.createdAt) || "—" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans"
      role="dialog"
      aria-modal="true"
      aria-label="Worker account details"
    >
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#3087C5] text-white flex items-center justify-center shadow-xs">
              <HardHat className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-gray-900 text-base">Worker Account Details</h3>
              <p className="text-xs font-bold text-[#3087C5]">
                Worker ID: {worker.workerNo || "Not assigned"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close worker details"
            className="w-8 h-8 rounded-full bg-gray-200/80 hover:bg-gray-300 text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          <div className="flex items-center space-x-4 bg-gray-50 p-4 rounded-2xl border border-gray-200">
            <div className="w-20 h-20 rounded-2xl bg-white overflow-hidden border border-gray-200 shrink-0">
              {worker.profilePhoto ? (
                <img
                  src={worker.profilePhoto}
                  alt={worker.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-sky-50 text-[#3087C5] flex items-center justify-center text-xl font-black">
                  {initials(worker.name)}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-black text-gray-900 text-base truncate">{worker.name}</h4>
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                    STATUS_STYLES[worker.status] ?? "bg-gray-100 text-gray-600"
                  }`}
                >
                  {worker.status}
                </span>
              </div>
              <p className="text-xs font-semibold text-gray-500">
                Birthday: {formatDate(worker.birthday) || "—"}
              </p>
              <p className="text-xs font-semibold text-gray-500">
                Gender: {worker.gender || "—"}
              </p>
            </div>
          </div>

          <div className="space-y-1 text-xs font-semibold text-gray-700">
            {rows.map((row) => (
              <div
                key={row.label}
                className="flex justify-between gap-4 py-2 border-b border-gray-100"
              >
                <span className="text-gray-500 shrink-0">{row.label}</span>
                <span className="font-bold text-gray-900 text-right break-words">{row.value}</span>
              </div>
            ))}

            <div className="flex justify-between items-center gap-4 py-2 bg-sky-50 px-3 rounded-xl border border-sky-100 mt-2">
              <span className="text-sky-800 font-bold">Account Password</span>
              <span className="font-bold text-gray-600 text-right">
                Not shown — managed by the worker
              </span>
            </div>
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
