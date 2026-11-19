import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Eye,
  Filter,
  Package,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorBanner, ListSkeleton } from "@/components/common/Feedback";
import { useToast } from "@/components/common/Toast";
import { OrderDetailsModal } from "@/components/ui/AdminOrderDetailsModal";
import { api, getErrorMessage, isApiError } from "@/lib/api";
import { formatPeso } from "@/lib/format";
import type { OrderRecord } from "@/lib/types";

type OrderTab = "pending" | "ready" | "claimed" | "cancelled" | "not_claimed";

const TABS: { key: OrderTab; name: string; icon: typeof ShoppingCart }[] = [
  { key: "pending", name: "Pending", icon: ShoppingCart },
  { key: "ready", name: "Ready", icon: Package },
  { key: "claimed", name: "Claimed", icon: CheckCircle2 },
  { key: "cancelled", name: "Canceled", icon: Ban },
  { key: "not_claimed", name: "Didn't Claimed", icon: AlertTriangle },
];

const TAB_ORDER = TABS.map((tab) => tab.key);

const EMPTY_COUNTS: Record<OrderTab, number> = {
  pending: 0,
  ready: 0,
  claimed: 0,
  cancelled: 0,
  not_claimed: 0,
};

const PER_PAGE = 10;

/** `dbId` is optional in the shared model — fall back to a numeric display id. */
function orderDbId(order: OrderRecord): number {
  if (typeof order.dbId === "number") return order.dbId;
  const parsed = Number.parseInt(order.id, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Maps a failed status transition to a friendly message (409s carry the reason). */
function statusErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    if (error.code === "invalid_order_status") {
      return error.message || "This order can no longer change to that status.";
    }
    if (error.status === 409) {
      return error.message || "This change is not allowed for the order's current status.";
    }
    if (error.status === 404) {
      return "This order no longer exists. Refreshing the list…";
    }
  }
  return getErrorMessage(error);
}

export default function OrdersPage() {
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<OrderTab>("pending");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [meta, setMeta] = useState<{ currentPage: number; lastPage: number; total: number } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<OrderTab, number>>(EMPTY_COUNTS);

  const [pendingAction, setPendingAction] = useState<{ id: number; status: OrderTab } | null>(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<OrderRecord | null>(null);
  const [isCategoryOpen, setIsCategoryOpen] = useState(true);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  /** Guards against stale list responses when the tab/search/page changes fast. */
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const request = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const result = await api.worker.orders({
        status: activeTab,
        search: search.trim() || undefined,
        page,
        perPage: PER_PAGE,
      });
      if (request !== requestId.current) return;
      setOrders(result.items);
      setMeta({
        currentPage: result.meta.currentPage,
        lastPage: result.meta.lastPage,
        total: result.meta.total,
      });
    } catch (caught) {
      if (request !== requestId.current) return;
      setOrders([]);
      setMeta(null);
      setError(getErrorMessage(caught));
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }, [activeTab, search, page]);

  const loadCounts = useCallback(async () => {
    const entries = await Promise.all(
      TAB_ORDER.map(async (status) => {
        try {
          const result = await api.worker.orders({ status, perPage: 1 });
          return [status, result.meta.total] as const;
        } catch {
          return [status, 0] as const;
        }
      }),
    );
    setCounts(Object.fromEntries(entries) as Record<OrderTab, number>);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadCounts();
  }, [loadCounts]);

  // Debounced search (350 ms) — resets to the first page.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const refresh = async () => {
    await Promise.all([load(), loadCounts()]);
  };

  const updateStatus = async (order: OrderRecord, status: OrderTab, successLabel: string) => {
    const dbId = orderDbId(order);
    if (!dbId) {
      toast.error("This order cannot be updated because its reference is missing.");
      return;
    }
    setPendingAction({ id: dbId, status });
    try {
      await api.worker.updateOrderStatus(dbId, status);
      toast.success(
        `Order #${order.orderNumber ?? order.dbId ?? order.id} marked as ${successLabel}.`,
      );
      await refresh();
    } catch (caught) {
      toast.error(statusErrorMessage(caught));
      // A terminal-status conflict means our list is stale: refresh it.
      if (isApiError(caught) && caught.status === 409) await refresh();
    } finally {
      setPendingAction(null);
    }
  };

  const isBusy = (order: OrderRecord) =>
    pendingAction !== null && pendingAction.id === orderDbId(order);
  const isLoading = (order: OrderRecord, status: OrderTab) =>
    pendingAction !== null && pendingAction.id === orderDbId(order) && pendingAction.status === status;

  const handlePage = (nextPage: number) => {
    if (!meta) return;
    setPage(Math.min(Math.max(1, nextPage), meta.lastPage));
  };

  const activeTabName = TABS.find((tab) => tab.key === activeTab)?.name ?? "Orders";

  return (
    <section className="bg-[#EBE9E1] min-h-screen w-full py-10 px-4 sm:px-6 relative font-sans">
      <OrderDetailsModal
        isOpen={selectedOrderDetails !== null}
        onClose={() => setSelectedOrderDetails(null)}
        order={selectedOrderDetails}
      />

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 items-start">
        {/* MOBILE FILTER BUTTON */}
        <div className="w-full lg:hidden">
          <button
            onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
            className="w-full bg-[#3087C5] text-white py-3 px-5 rounded-2xl font-bold flex items-center justify-center space-x-2 shadow-md hover:bg-[#256fa4] transition-colors"
          >
            <Filter className="w-5 h-5" />
            <span>{isMobileFilterOpen ? "Hide Orders Center" : "Orders Navigation Center"}</span>
          </button>
        </div>

        {/* SIDEBAR FILTERS */}
        <aside
          className={`w-full lg:w-85 shrink-0 bg-[#E3DFD3] border border-gray-300/80 rounded-2xl p-5 shadow-sm space-y-6 ${
            isMobileFilterOpen ? "block" : "hidden lg:block"
          }`}
        >
          <div>
            <div
              className="flex items-center justify-between cursor-pointer pb-3"
              onClick={() => setIsCategoryOpen(!isCategoryOpen)}
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#3087C5] text-white flex items-center justify-center shadow-xs">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <h3 className="font-black text-gray-900 text-base">Orders Center</h3>
              </div>
              <button className="text-gray-600 hover:text-gray-900" aria-label="Toggle orders navigation">
                {isCategoryOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>

            {isCategoryOpen && (
              <div className="mt-2 space-y-0 border-t border-gray-300/60 overflow-hidden rounded-none">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isSelected = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => {
                        setActiveTab(tab.key);
                        setPage(1);
                        setIsMobileFilterOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-3 text-xs sm:text-sm font-bold transition-all rounded-none ${
                        isSelected
                          ? "bg-white text-gray-900 border-l-4 border-[#3087C5] shadow-xs"
                          : "bg-white/40 text-gray-700 hover:bg-white/70 border-l-4 border-transparent"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="w-4 h-4 text-[#3087C5]" />
                        <span className="truncate text-left">{tab.name}</span>
                      </div>
                      <span className="text-xs font-semibold text-gray-500 bg-gray-200/60 px-2 py-0.5 rounded-full shrink-0">
                        ({counts[tab.key].toLocaleString()})
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 w-full space-y-5">
          {/* Header & Search Bar */}
          <div className="bg-white/60 backdrop-blur-xs p-4 rounded-2xl border border-gray-300/60 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <h2 className="text-lg font-black text-[#3087C5]">
              {activeTab === "cancelled" ? "Cancelled Orders" : `${activeTabName} Orders`}
              <span className="text-xs font-bold text-gray-500 ml-1.5">({counts[activeTab]})</span>
            </h2>

            <form
              className="relative w-full sm:w-80 flex items-center"
              onSubmit={(event) => {
                event.preventDefault();
                setSearch(searchInput.trim());
                setPage(1);
              }}
            >
              <input
                type="search"
                placeholder="Search customer or order #..."
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                aria-label="Search orders"
                className="w-full bg-white border border-gray-300 rounded-full py-2 pl-4 pr-12 text-sm font-medium focus:outline-none focus:border-[#3087C5]"
              />
              <button
                type="submit"
                aria-label="Search orders"
                className="absolute right-1 bg-[#3087C5] text-white p-2 rounded-full hover:bg-[#256fa4] transition-colors cursor-pointer"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Active search info */}
          {search && (
            <div className="flex items-center justify-between bg-white/40 px-4 py-2 rounded-xl text-xs font-bold text-gray-600">
              <span>
                Showing search results for "{search}" ({meta?.total ?? orders.length})
              </span>
              <button
                onClick={() => {
                  setSearchInput("");
                  setSearch("");
                  setPage(1);
                }}
                className="text-[#3087C5] hover:underline flex items-center space-x-1"
              >
                <span>Clear Search</span>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Orders list */}
          {loading ? (
            <ListSkeleton count={3} />
          ) : error ? (
            <ErrorBanner message={error} onRetry={() => void load()} />
          ) : orders.length === 0 ? (
            <EmptyState
              icon={<Package className="w-10 h-10" />}
              title={`No ${activeTabName.toLowerCase()} orders`}
              description={
                search
                  ? `No orders matched “${search}”. Try an order number or customer name.`
                  : "Orders will appear here as customers place them."
              }
            />
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const busy = isBusy(order);
                const showDeadline = activeTab === "ready" || activeTab === "not_claimed";
                return (
                  <div
                    key={orderDbId(order) || order.id}
                    className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 transition-all hover:shadow-md"
                  >
                    {/* Order information */}
                    <div className="flex items-center space-x-4 w-full sm:w-auto min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-sky-50 text-[#3087C5] flex items-center justify-center shrink-0 border border-sky-100 shadow-2xs">
                        <Package className="w-6 h-6" />
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <h4 className="font-black text-gray-900 text-sm sm:text-base truncate">
                          Customer: {order.customerName || "—"}
                        </h4>
                        <p className="text-xs font-bold text-gray-700">
                          Order # {order.orderNumber ?? order.id}
                        </p>
                        <p className="text-xs font-bold text-gray-700">
                          Status: <span className="text-[#3087C5]">{order.status}</span>
                        </p>
                        <p className="text-xs font-semibold text-gray-500 flex flex-wrap items-center gap-2">
                          <span>Date: {order.dateOrdered}</span>
                          {showDeadline && (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black rounded-full ${
                                activeTab === "not_claimed"
                                  ? "bg-red-100 text-red-600"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              <Clock className="w-3 h-3" />
                              {order.claimDeadline
                                ? `Claim by: ${order.claimDeadline}`
                                : "Date to Claim: +3 days"}
                            </span>
                          )}
                          {order.customerPhone && (
                            <span className="text-[11px] text-gray-500">{order.customerPhone}</span>
                          )}
                        </p>
                        <p className="text-xs font-bold text-gray-900">
                          Total Price:{" "}
                          <span className="text-[#3087C5]">{formatPeso(order.totalPrice)}</span>
                          <span className="ml-2 text-[11px] font-semibold text-gray-500">
                            ({order.items.length} item{order.items.length === 1 ? "" : "s"})
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Dynamic action buttons */}
                    <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                      {activeTab === "pending" && (
                        <>
                          <Button
                            variant="gold"
                            size="sm"
                            onClick={() => void updateStatus(order, "ready", "Ready to Claim")}
                            loading={isLoading(order, "ready")}
                            disabled={busy}
                            className="rounded-full font-bold"
                          >
                            {!isLoading(order, "ready") && <Clock className="w-3.5 h-3.5" />}
                            <span>Order Ready</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void updateStatus(order, "cancelled", "Cancelled")}
                            loading={isLoading(order, "cancelled")}
                            disabled={busy}
                            className="rounded-full font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                          >
                            {!isLoading(order, "cancelled") && <Ban className="w-3.5 h-3.5" />}
                            <span>Cancel Order</span>
                          </Button>
                        </>
                      )}

                      {activeTab === "ready" && (
                        <>
                          <Button
                            variant="gold"
                            size="sm"
                            onClick={() => void updateStatus(order, "claimed", "Claimed")}
                            loading={isLoading(order, "claimed")}
                            disabled={busy}
                            className="rounded-full font-bold"
                          >
                            {!isLoading(order, "claimed") && <CheckCircle2 className="w-3.5 h-3.5" />}
                            <span>Order Claimed</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void updateStatus(order, "not_claimed", "Didn't Claimed")}
                            loading={isLoading(order, "not_claimed")}
                            disabled={busy}
                            className="rounded-full font-bold hover:bg-amber-50 hover:text-amber-700"
                          >
                            {!isLoading(order, "not_claimed") && (
                              <AlertTriangle className="w-3.5 h-3.5" />
                            )}
                            <span>Didn't Claimed</span>
                          </Button>
                        </>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedOrderDetails(order)}
                        disabled={busy}
                        className="rounded-full font-bold hover:bg-sky-50 hover:text-[#3087C5]"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Details</span>
                      </Button>
                    </div>
                  </div>
                );
              })}

              {meta && meta.lastPage > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white/60 backdrop-blur-xs px-4 py-3 rounded-2xl border border-gray-300/60 shadow-xs">
                  <p className="text-xs font-bold text-gray-600">
                    Page {meta.currentPage} of {meta.lastPage} · {meta.total.toLocaleString()} orders
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="white"
                      size="sm"
                      onClick={() => handlePage(page - 1)}
                      disabled={page <= 1}
                      className="rounded-full"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Prev</span>
                    </Button>
                    <Button
                      variant="white"
                      size="sm"
                      onClick={() => handlePage(page + 1)}
                      disabled={page >= meta.lastPage}
                      className="rounded-full"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
