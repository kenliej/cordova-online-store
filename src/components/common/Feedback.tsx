import type { ReactNode } from "react";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Centered spinner used while a whole page/section is loading. */
export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-500" role="status">
      <Loader2 className="w-8 h-8 animate-spin text-[#3087C5]" />
      <span className="text-sm font-semibold">{label}</span>
    </div>
  );
}

/** Small inline spinner for buttons. */
export function InlineSpinner({ className = "w-4 h-4" }: { className?: string }) {
  return <Loader2 className={`${className} animate-spin`} />;
}

/** Error banner with an optional retry action. */
export function ErrorBanner({
  message,
  onRetry,
  className = "",
}: {
  message: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={`flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800 ${className}`}
    >
      <div className="flex items-start gap-2 flex-1">
        <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
        <span className="leading-snug">{message}</span>
      </div>
      {onRetry && (
        <Button
          variant="white"
          size="sm"
          onClick={onRetry}
          className="border-rose-200 text-rose-700 hover:bg-rose-100 shrink-0 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Try Again</span>
        </Button>
      )}
    </div>
  );
}

/** Empty-state block for lists. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-300 bg-white/70 px-6 py-14 text-center ${className}`}
    >
      {icon && <div className="text-[#3087C5]">{icon}</div>}
      <h3 className="text-base font-black text-gray-900">{title}</h3>
      {description && <p className="max-w-md text-sm font-medium text-gray-500">{description}</p>}
      {action}
    </div>
  );
}

/** Simple pulse placeholder block. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-gray-200/80 ${className}`} />;
}

/** Grid of card-shaped skeletons (products / stores). */
export function CardGridSkeleton({ count = 8, className = "" }: { count?: number; className?: string }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ${className}`}>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="mt-3 h-4 w-3/4" />
          <Skeleton className="mt-2 h-3 w-1/2" />
          <Skeleton className="mt-3 h-5 w-1/3" />
          <Skeleton className="mt-4 h-9 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Rows skeleton for list-style pages (orders, notifications, cart). */
export function ListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4">
          <Skeleton className="h-14 w-14 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>
      ))}
    </div>
  );
}
