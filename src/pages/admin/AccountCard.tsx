import { CheckCircle2, Edit, Eye, RotateCcw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate, initials } from "@/lib/format";
import type { AdminAccountRow } from "@/lib/types";

/** Tabs of the admin accounts dashboard (wire values of `?tab=`). */
export type AccountTab = "pending" | "customer" | "worker" | "removed";

interface AccountCardProps {
  account: AdminAccountRow;
  tab: AccountTab;
  /** True while an action for this account is in flight. */
  busy?: boolean;
  onApprove: (account: AdminAccountRow) => void;
  onReject: (account: AdminAccountRow) => void;
  onViewId: (account: AdminAccountRow) => void;
  onViewDetails: (account: AdminAccountRow) => void;
  onEdit: (account: AdminAccountRow) => void;
  onRemove: (account: AdminAccountRow) => void;
  onRestore: (account: AdminAccountRow) => void;
}

function Field({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string | null | undefined;
  strong?: boolean;
}) {
  return (
    <p>
      <span className="font-bold text-gray-900">{label}:</span>{" "}
      <span className={strong ? "text-[#3087C5] font-bold" : "text-[#3087C5]"}>{value || "—"}</span>
    </p>
  );
}

function Avatar({ account }: { account: AdminAccountRow }) {
  if (account.profilePhoto) {
    return (
      <img
        src={account.profilePhoto}
        alt={account.name || "Account photo"}
        className="w-full h-full object-cover"
        loading="lazy"
      />
    );
  }
  return (
    <div className="w-full h-full bg-sky-50 text-[#3087C5] flex items-center justify-center text-3xl font-black">
      {initials(account.name)}
    </div>
  );
}

/**
 * One account row of the admin accounts dashboard. Renders the same data in all
 * four tabs and exposes only the actions that make sense for that tab.
 */
export function AccountCard({
  account,
  tab,
  busy = false,
  onApprove,
  onReject,
  onViewId,
  onViewDetails,
  onEdit,
  onRemove,
  onRestore,
}: AccountCardProps) {
  const roleLabel =
    account.role === "worker" ? "Worker" : account.role === "admin" ? "Admin" : "Customer";

  const identifierLabel =
    tab === "worker"
      ? "Worker ID"
      : tab === "customer"
        ? "Customer ID"
        : tab === "removed"
          ? `${roleLabel} ID`
          : null;

  const identifier =
    tab === "worker"
      ? account.workerNo
      : tab === "customer"
        ? account.customerNo
        : tab === "removed"
          ? roleLabel === "Worker"
            ? account.workerNo
            : account.customerNo
          : null;

  const statusBadge =
    tab === "removed" ? (account.status === "banned" ? "Banned" : "Removed") : null;

  return (
    <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row items-start space-y-4 sm:space-y-0 sm:space-x-5">
      <div className="w-32 h-36 rounded-2xl overflow-hidden border border-gray-200 shrink-0">
        <Avatar account={account} />
      </div>

      <div className="flex-1 space-y-1 text-xs font-semibold text-gray-700 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {statusBadge && (
            <span
              className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                account.status === "banned"
                  ? "bg-red-100 text-red-700"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {statusBadge}
            </span>
          )}
          {tab === "removed" && (
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {roleLabel}
            </span>
          )}
        </div>

        {identifierLabel && <Field label={identifierLabel} value={identifier} strong />}
        <Field label="Name" value={account.name} strong />
        <Field label="Birthday" value={formatDate(account.birthday)} />
        <Field label="Gender" value={account.gender} />
        <Field label="Address" value={account.address} />
        <Field label="Phone Number" value={account.phone} />
        <Field label="Email" value={account.email} />

        {tab === "customer" && (
          <p>
            <span className="font-bold text-gray-900">Didn't Claimed Records:</span>{" "}
            <span
              className={`font-black ${
                account.badRecords >= 2 ? "text-red-600" : "text-amber-600"
              }`}
            >
              {account.badRecords}/2
            </span>
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-3">
          {tab === "pending" && (
            <>
              <Button
                variant="gold"
                size="sm"
                onClick={() => onApprove(account)}
                disabled={busy}
                className="rounded-full font-bold px-4"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Accept</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onViewId(account)}
                disabled={busy}
                className="rounded-full font-bold px-4"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>View ID</span>
              </Button>
              <Button
                variant="white"
                size="sm"
                onClick={() => onReject(account)}
                disabled={busy}
                className="rounded-full font-bold border-gray-300 px-4 text-gray-900"
              >
                <XCircle className="w-3.5 h-3.5 text-gray-900" />
                <span>Reject</span>
              </Button>
            </>
          )}

          {tab === "customer" && (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onViewDetails(account)}
                disabled={busy}
                className="rounded-full font-bold px-4"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>View Details</span>
              </Button>
              <Button
                variant="white"
                size="sm"
                onClick={() => onRemove(account)}
                disabled={busy}
                className="rounded-full font-bold border-gray-300 px-4 text-gray-900"
              >
                <XCircle className="w-3.5 h-3.5 text-gray-900" />
                <span>{account.badRecords >= 2 ? "Ban Account" : "Remove Account"}</span>
              </Button>
            </>
          )}

          {tab === "worker" && (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onViewDetails(account)}
                disabled={busy}
                className="rounded-full font-bold px-4"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>View Details</span>
              </Button>
              <Button
                variant="gold"
                size="sm"
                onClick={() => onEdit(account)}
                disabled={busy}
                className="rounded-full font-bold px-4"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit</span>
              </Button>
              <Button
                variant="white"
                size="sm"
                onClick={() => onRemove(account)}
                disabled={busy}
                className="rounded-full font-bold border-gray-300 px-4 text-gray-900"
              >
                <XCircle className="w-3.5 h-3.5 text-gray-900" />
                <span>Remove Account</span>
              </Button>
            </>
          )}

          {tab === "removed" && (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onViewDetails(account)}
                disabled={busy}
                className="rounded-full font-bold px-4"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>View Details</span>
              </Button>
              <Button
                variant="white"
                size="sm"
                onClick={() => onRestore(account)}
                disabled={busy}
                className="rounded-full font-bold border-gray-300 px-4 text-gray-900"
              >
                <RotateCcw className="w-3.5 h-3.5 text-gray-900" />
                <span>Unremoved</span>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
