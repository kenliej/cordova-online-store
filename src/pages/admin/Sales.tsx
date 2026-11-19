import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Ban,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  SlidersHorizontal,
  TrendingUp,
} from "lucide-react";
import { LoadingState, ErrorBanner, EmptyState } from "@/components/common/Feedback";
import { OrderCard } from "@/components/ui/OrderCard";
import { OrderDetailsModal } from "@/components/ui/AdminOrderDetailsModal";
import { api, getErrorMessage } from "@/lib/api";
import { formatDate, formatPeso, todayInputValue } from "@/lib/format";
import type { OrderRecord, SalesReport, SalesSummary } from "@/lib/types";

type SalesTab = "Dashboard" | "Complete" | "Cancelled" | "Didn't Claimed";

const TABS: { key: SalesTab; name: string; icon: typeof TrendingUp }[] = [
  { key: "Dashboard", name: "Dashboard", icon: TrendingUp },
  { key: "Complete", name: "Complete", icon: CheckCircle2 },
  { key: "Cancelled", name: "Cancelled", icon: Ban },
  { key: "Didn't Claimed", name: "Didn't Claimed", icon: AlertTriangle },
];

const REPORT_STATUS: Record<Exclude<SalesTab, "Dashboard">, "claimed" | "cancelled" | "not_claimed"> = {
  Complete: "claimed",
  Cancelled: "cancelled",
  "Didn't Claimed": "not_claimed",
};

function shiftIsoDate(iso: string, offsetDays: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function monthLabel(month: string): string {
  if (!/^\d{4}-\d{2}$/.test(month)) return month || "—";
  const date = new Date(`${month}-01T00:00:00`);
  return Number.isNaN(date.getTime())
    ? month
    : date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function KpiCard({
  label,
  value,
  icon,
  tone,
  hint,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: string;
  hint?: string;
}) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-2">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tone}`}>{icon}</div>
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</p>
      <h3 className="text-2xl font-black text-gray-900 break-words">{value}</h3>
      {hint && <p className="text-[11px] font-semibold text-gray-500">{hint}</p>}
    </div>
  );
}

export default function Sales() {
  const [activeTab, setActiveTab] = useState<SalesTab>("Dashboard");
  const [selectedDate, setSelectedDate] = useState(() => todayInputValue());
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [report, setReport] = useState<SalesReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const [selectedOrderDetails, setSelectedOrderDetails] = useState<OrderRecord | null>(null);
  /** Guard against stale summary/report responses when tabs/dates change fast. */
  const summaryRequestId = useRef(0);
  const reportRequestId = useRef(0);

  const month = selectedDate.slice(0, 7);

  const loadSummary = useCallback(async () => {
    const request = ++summaryRequestId.current;
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const result = await api.admin.salesSummary(month);
      if (request !== summaryRequestId.current) return;
      setSummary(result);
    } catch (caught) {
      if (request !== summaryRequestId.current) return;
      setSummary(null);
      setSummaryError(getErrorMessage(caught));
    } finally {
      if (request === summaryRequestId.current) setSummaryLoading(false);
    }
  }, [month]);

  const loadReport = useCallback(async () => {
    if (activeTab === "Dashboard") return;
    const request = ++reportRequestId.current;
    setReportLoading(true);
    setReportError(null);
    try {
      const result = await api.admin.sales({
        date: selectedDate,
        status: REPORT_STATUS[activeTab],
      });
      if (request !== reportRequestId.current) return;
      setReport(result);
    } catch (caught) {
      if (request !== reportRequestId.current) return;
      setReport(null);
      setReportError(getErrorMessage(caught));
    } finally {
      if (request === reportRequestId.current) setReportLoading(false);
    }
  }, [activeTab, selectedDate]);

  useEffect(() => {
    if (activeTab === "Dashboard") void loadSummary();
    else void loadReport();
  }, [activeTab, loadSummary, loadReport]);

  const orders = report?.orders ?? [];
  const revenue = report?.revenue ?? 0;
  const cancelledTotal = report?.cancelledTotal ?? 0;
  const notClaimedTotal = report?.notClaimedTotal ?? 0;

  const headerTitle =
    activeTab === "Complete"
      ? `Revenue: ${formatPeso(revenue)} (${orders.length})`
      : activeTab === "Cancelled"
        ? `Cancelled Total: ${formatPeso(cancelledTotal)} (${orders.length})`
        : `Didn't Claimed Total: ${formatPeso(notClaimedTotal)} (${orders.length})`;

  const emptyCopy: Record<Exclude<SalesTab, "Dashboard">, string> = {
    Complete: "No completed sales records found for this date.",
    Cancelled: "No cancelled orders found for this date.",
    "Didn't Claimed": "No unclaimed orders found for this date.",
  };

  return (
    <section className="bg-[#EBE9E1] min-h-screen w-full py-10 px-4 sm:px-6 relative font-sans">
      {/* Order Details Modal */}
      <OrderDetailsModal
        isOpen={selectedOrderDetails !== null}
        onClose={() => setSelectedOrderDetails(null)}
        order={selectedOrderDetails}
      />

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 items-start">
        {/* SIDEBAR NAVIGATION */}
        <aside className="w-full lg:w-85 shrink-0 bg-[#E3DFD3] border border-gray-300/80 rounded-2xl p-5 shadow-sm space-y-6">
          <div>
            <div
              className="flex items-center justify-between cursor-pointer pb-3"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#3087C5] text-white flex items-center justify-center shadow-xs">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <h3 className="font-black text-gray-900 text-base">Sales Center</h3>
              </div>
              <button className="text-gray-600 hover:text-gray-900" aria-label="Toggle sales navigation">
                {isSidebarOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>

            {isSidebarOpen && (
              <div className="mt-2 space-y-0 border-t border-gray-300/60 overflow-hidden">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isSelected = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`w-full flex items-center justify-between px-3.5 py-3 text-xs sm:text-sm font-bold transition-all rounded-none ${
                        isSelected
                          ? "bg-white text-gray-900 border-l-4 border-[#3087C5] shadow-xs"
                          : "bg-white/40 text-gray-700 hover:bg-white/70 border-l-4 border-transparent"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="w-4 h-4 text-[#3087C5]" />
                        <span className="truncate text-left">{tab.name}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 w-full space-y-6">
          {activeTab === "Dashboard" ? (
            <>
              <div className="bg-white/60 backdrop-blur-xs p-5 rounded-2xl border border-gray-300/60 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-[#3087C5]">Sales &amp; Performance Overview</h2>
                  <p className="text-xs font-medium text-gray-500 mt-0.5">
                    Summary of revenue, cancellations, and unclaimed records.
                  </p>
                </div>
                <div className="flex items-center space-x-2 bg-white border border-gray-300 rounded-full px-4 py-1.5 shadow-2xs text-xs sm:text-sm font-black text-gray-800">
                  <Calendar className="w-4 h-4 text-[#3087C5]" />
                  <span>{monthLabel(summary?.month || month)}</span>
                </div>
              </div>

              {summaryLoading ? (
                <div className="bg-white rounded-3xl border border-gray-200 shadow-sm">
                  <LoadingState label="Loading sales summary…" />
                </div>
              ) : summaryError ? (
                <ErrorBanner message={summaryError} onRetry={() => void loadSummary()} />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                  <KpiCard
                    label="Total Revenue (Monthly)"
                    value={formatPeso(summary?.revenue ?? 0)}
                    icon={<TrendingUp className="w-5 h-5" />}
                    tone="bg-sky-50 text-[#3087C5]"
                    hint="Claimed orders this month"
                  />
                  <KpiCard
                    label="Total Orders"
                    value={(summary?.ordersCount ?? 0).toLocaleString()}
                    icon={<CheckCircle2 className="w-5 h-5" />}
                    tone="bg-emerald-50 text-emerald-600"
                    hint="All orders this month"
                  />
                  <KpiCard
                    label="Total Cancelled Orders"
                    value={(summary?.cancelledCount ?? 0).toLocaleString()}
                    icon={<Ban className="w-5 h-5" />}
                    tone="bg-red-50 text-red-600"
                    hint={`Worth ${formatPeso(summary?.cancelledTotal ?? 0)}`}
                  />
                  <KpiCard
                    label="Total Didn't Claimed"
                    value={(summary?.notClaimedCount ?? 0).toLocaleString()}
                    icon={<AlertTriangle className="w-5 h-5" />}
                    tone="bg-amber-50 text-amber-600"
                    hint={`Worth ${formatPeso(summary?.notClaimedTotal ?? 0)}`}
                  />
                </div>
              )}
            </>
          ) : (
            <>
              {/* HEADER & DATE PAGINATION BAR */}
              <div className="bg-white/60 backdrop-blur-xs p-4 rounded-2xl border border-gray-300/60 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                <h2 className="text-base sm:text-lg font-black text-[#3087C5]">{headerTitle}</h2>

                <div className="flex items-center space-x-2 bg-white border border-gray-300 rounded-full px-3 py-1.5 shadow-2xs">
                  <button
                    onClick={() => setSelectedDate((current) => shiftIsoDate(current, -1))}
                    className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
                    aria-label="Previous date"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="flex items-center space-x-1.5 px-3 text-xs sm:text-sm font-black text-gray-800">
                    <Calendar className="w-4 h-4 text-[#3087C5]" />
                    <span>Date: {formatDate(selectedDate) || selectedDate}</span>
                  </div>
                  <button
                    onClick={() => setSelectedDate((current) => shiftIsoDate(current, 1))}
                    className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
                    aria-label="Next date"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Per-date totals row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white rounded-2xl border border-gray-200 px-4 py-3 shadow-xs">
                  <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                    Claimed Revenue
                  </p>
                  <p className="text-lg font-black text-gray-900">{formatPeso(revenue)}</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-200 px-4 py-3 shadow-xs">
                  <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                    Cancelled Total
                  </p>
                  <p className="text-lg font-black text-red-600">{formatPeso(cancelledTotal)}</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-200 px-4 py-3 shadow-xs">
                  <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                    Didn't Claimed Total
                  </p>
                  <p className="text-lg font-black text-amber-600">{formatPeso(notClaimedTotal)}</p>
                </div>
              </div>

              {/* Orders list */}
              {reportLoading ? (
                <div className="bg-white rounded-3xl border border-gray-200 shadow-sm">
                  <LoadingState label="Loading daily report…" />
                </div>
              ) : reportError ? (
                <ErrorBanner message={reportError} onRetry={() => void loadReport()} />
              ) : orders.length === 0 ? (
                <EmptyState
                  icon={<Calendar className="w-10 h-10" />}
                  title={`No ${activeTab.toLowerCase()} orders`}
                  description={`${emptyCopy[activeTab]} (${formatDate(selectedDate) || selectedDate})`}
                />
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <OrderCard
                      key={order.dbId || order.id}
                      order={order}
                      onViewDetails={(selected) => setSelectedOrderDetails(selected)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
