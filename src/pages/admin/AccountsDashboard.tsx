import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  HardHat,
  Plus,
  Search,
  SlidersHorizontal,
  UserPlus,
  Users,
  UserX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorBanner, ListSkeleton } from "@/components/common/Feedback";
import { useToast } from "@/components/common/Toast";
import { ViewIdModal } from "@/components/ui/ViewIdModal";
import { CustomerDetailsModal } from "@/components/ui/CustomerDetailsModal";
import { WorkerDetailsModal } from "@/components/ui/WorkerDetailsModal";
import { WorkerFormModal, type WorkerFormValues } from "@/components/ui/WorkerFormModal";
import { AccountCard, type AccountTab } from "@/pages/admin/AccountCard";
import { api, getErrorMessage } from "@/lib/api";
import type {
  AdminAccountRow,
  AdminIdDocuments,
  AdminStore,
  PaginationMeta,
} from "@/lib/types";

/** Backwards-compatible aliases for the account view models. */
export type PendingAccount = AdminAccountRow;
export type CustomerAccount = AdminAccountRow;
export type WorkerAccount = AdminAccountRow;

const TAB_ORDER: AccountTab[] = ["pending", "customer", "worker", "removed"];

const TABS = [
  { key: "pending", name: "Pending Accounts", icon: UserPlus },
  { key: "customer", name: "Customer Accounts", icon: Users },
  { key: "worker", name: "Worker Accounts", icon: HardHat },
  { key: "removed", name: "Removed Accounts", icon: UserX },
] as const;

const EMPTY_COUNTS: Record<AccountTab, number> = {
  pending: 0,
  customer: 0,
  worker: 0,
  removed: 0,
};

const PER_PAGE = 10;

interface PagerProps {
  meta: PaginationMeta | null;
  page: number;
  noun: string;
  onPage: (page: number) => void;
}

function Pager({ meta, page, noun, onPage }: PagerProps) {
  if (!meta || meta.lastPage <= 1) return null;
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white/60 backdrop-blur-xs px-4 py-3 rounded-2xl border border-gray-300/60 shadow-xs">
      <p className="text-xs font-bold text-gray-600">
        Page {meta.currentPage} of {meta.lastPage} · {meta.total.toLocaleString()} {noun}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="white"
          size="sm"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="rounded-full"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Prev</span>
        </Button>
        <Button
          variant="white"
          size="sm"
          onClick={() => onPage(page + 1)}
          disabled={page >= meta.lastPage}
          className="rounded-full"
        >
          <span>Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function AccountsDashboard() {
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<AccountTab>("pending");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [rows, setRows] = useState<AdminAccountRow[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<AccountTab, number>>(EMPTY_COUNTS);
  const [actionId, setActionId] = useState<number | null>(null);
  /** Guards against stale list responses when the tab/search/page changes fast. */
  const requestId = useRef(0);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Modal state
  const [idAccount, setIdAccount] = useState<AdminAccountRow | null>(null);
  const [detailsAccount, setDetailsAccount] = useState<AdminAccountRow | null>(null);
  const [workerFormOpen, setWorkerFormOpen] = useState(false);
  const [workerToEdit, setWorkerToEdit] = useState<AdminAccountRow | null>(null);
  const [stores, setStores] = useState<AdminStore[]>([]);
  const [storesLoading, setStoresLoading] = useState(false);

  // ID documents shared by the View ID / Customer Details modals
  const [documents, setDocuments] = useState<AdminIdDocuments | null>(null);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [documentsAccountId, setDocumentsAccountId] = useState<number | null>(null);
  /** Guards against a slow ID-document response overwriting a newer request. */
  const documentsRequestId = useRef(0);

  /* ------------------------------------------------------------------ */
  /* Data loading                                                       */
  /* ------------------------------------------------------------------ */

  const load = useCallback(async () => {
    const request = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const result = await api.admin.accounts({
        tab: activeTab,
        search: search.trim() || undefined,
        page,
        perPage: PER_PAGE,
      });
      if (request !== requestId.current) return;
      setRows(result.items);
      setMeta(result.meta);
    } catch (caught) {
      if (request !== requestId.current) return;
      setRows([]);
      setMeta(null);
      setError(getErrorMessage(caught));
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }, [activeTab, search, page]);

  const loadCounts = useCallback(async () => {
    const entries = await Promise.all(
      TAB_ORDER.map(async (tab) => {
        try {
          const result = await api.admin.accounts({ tab, perPage: 1 });
          return [tab, result.meta.total] as const;
        } catch {
          return [tab, 0] as const;
        }
      }),
    );
    setCounts(Object.fromEntries(entries) as Record<AccountTab, number>);
  }, []);

  const loadStores = useCallback(async () => {
    setStoresLoading(true);
    try {
      const result = await api.admin.stores({ perPage: 50 });
      setStores(result.items);
    } catch {
      setStores([]);
    } finally {
      setStoresLoading(false);
    }
  }, []);

  const openDocuments = useCallback(async (account: AdminAccountRow) => {
    const request = ++documentsRequestId.current;
    setDocumentsAccountId(account.id);
    setDocuments(null);
    setDocumentsError(null);
    setDocumentsLoading(true);
    try {
      const result = await api.admin.idDocuments(account.id);
      if (request !== documentsRequestId.current) return;
      setDocuments(result);
    } catch (caught) {
      if (request !== documentsRequestId.current) return;
      setDocumentsError(getErrorMessage(caught));
    } finally {
      if (request === documentsRequestId.current) setDocumentsLoading(false);
    }
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

  // Store names are shown in the worker form + worker/removed detail modals.
  useEffect(() => {
    void loadStores();
  }, [loadStores]);

  /* ------------------------------------------------------------------ */
  /* Actions                                                            */
  /* ------------------------------------------------------------------ */

  const refresh = async () => {
    await Promise.all([load(), loadCounts()]);
  };

  const runAction = async (
    account: AdminAccountRow,
    action: () => Promise<unknown>,
    successMessage: string,
  ) => {
    setActionId(account.id);
    try {
      await action();
      toast.success(successMessage);
      await refresh();
    } catch (caught) {
      toast.error(getErrorMessage(caught));
    } finally {
      setActionId(null);
    }
  };

  const handleApprove = (account: AdminAccountRow) => {
    void runAction(
      account,
      () => api.admin.approveAccount(account.id),
      `${account.name}'s account has been approved.`,
    );
  };

  const handleReject = (account: AdminAccountRow) => {
    if (!window.confirm(`Reject ${account.name}'s registration?`)) return;
    void runAction(
      account,
      () => api.admin.rejectAccount(account.id),
      `${account.name}'s registration has been rejected.`,
    );
  };

  const handleRemove = (account: AdminAccountRow) => {
    const isBan = account.role === "customer" && account.badRecords >= 2;
    const label = isBan ? "Ban" : "Remove";
    const suffix = isBan
      ? "They have 2 or more unclaimed orders and will be banned."
      : "They will move to the Removed Accounts tab.";
    if (!window.confirm(`${label} ${account.name}'s account? ${suffix}`)) return;
    void runAction(
      account,
      () => api.admin.removeAccount(account.id, { ban: isBan }),
      `${account.name} has been ${isBan ? "banned" : "removed"}.`,
    );
  };

  const handleRestore = (account: AdminAccountRow) => {
    void runAction(
      account,
      () => api.admin.restoreAccount(account.id),
      `${account.name}'s account has been restored.`,
    );
  };

  const handleWorkerSubmit = async (values: WorkerFormValues) => {
    if (workerToEdit) {
      await api.admin.updateWorker(workerToEdit.id, values);
      toast.success(`Worker "${values.name}" has been updated.`);
    } else {
      await api.admin.createWorker(values);
      toast.success(`Worker "${values.name}" has been created.`);
    }
    setWorkerFormOpen(false);
    setWorkerToEdit(null);
    await refresh();
  };

  const openCreateWorker = () => {
    setWorkerToEdit(null);
    setWorkerFormOpen(true);
    if (stores.length === 0) void loadStores();
  };

  const openEditWorker = (account: AdminAccountRow) => {
    setWorkerToEdit(account);
    setWorkerFormOpen(true);
    if (stores.length === 0) void loadStores();
  };

  const openViewId = (account: AdminAccountRow) => {
    setIdAccount(account);
    void openDocuments(account);
  };

  const openDetails = (account: AdminAccountRow) => {
    setDetailsAccount(account);
    if (account.role === "customer") void openDocuments(account);
  };

  const storeNameFor = (storeId: number | null): string | null => {
    if (storeId === null) return null;
    return stores.find((store) => store.id === storeId)?.name ?? null;
  };

  /* ------------------------------------------------------------------ */
  /* Render helpers                                                     */
  /* ------------------------------------------------------------------ */

  const activeTabLabel = TABS.find((tab) => tab.key === activeTab)?.name ?? "Accounts";

  const renderTabCount = (tab: AccountTab) => {
    const value = counts[tab];
    if (value === 0 && meta === null) return "(…)";
    return `(${value.toLocaleString()})`;
  };

  return (
    <section className="bg-[#EBE9E1] min-h-screen w-full py-10 px-4 sm:px-6 relative font-sans">
      {/* Modals */}
      <ViewIdModal
        isOpen={idAccount !== null}
        onClose={() => setIdAccount(null)}
        accountName={idAccount?.name ?? ""}
        documents={documents}
        loading={documentsLoading}
        error={documentsError}
        onRetry={() => {
          if (idAccount) void openDocuments(idAccount);
        }}
      />

      <CustomerDetailsModal
        isOpen={detailsAccount !== null && detailsAccount.role !== "worker"}
        onClose={() => setDetailsAccount(null)}
        customer={detailsAccount}
        documents={documentsAccountId === detailsAccount?.id ? documents : null}
        documentsLoading={documentsLoading}
      />

      <WorkerDetailsModal
        isOpen={detailsAccount !== null && detailsAccount.role === "worker"}
        onClose={() => setDetailsAccount(null)}
        worker={detailsAccount}
        storeName={detailsAccount ? storeNameFor(detailsAccount.storeId) : null}
      />

      <WorkerFormModal
        isOpen={workerFormOpen}
        onClose={() => {
          setWorkerFormOpen(false);
          setWorkerToEdit(null);
        }}
        workerToEdit={workerToEdit}
        stores={stores}
        storesLoading={storesLoading}
        onSubmit={handleWorkerSubmit}
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
                <h3 className="font-black text-gray-900 text-base">Accounts Center</h3>
              </div>
              <button className="text-gray-600 hover:text-gray-900" aria-label="Toggle accounts navigation">
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
                      onClick={() => {
                        setActiveTab(tab.key);
                        setPage(1);
                      }}
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
                      <span className="text-xs font-semibold text-gray-500 bg-gray-200/60 px-2.5 py-0.5 rounded-full shrink-0">
                        {renderTabCount(tab.key)}
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
              {activeTabLabel}: {counts[activeTab].toLocaleString()}
            </h2>

            <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
              <form
                className="relative w-full sm:w-72 flex items-center"
                onSubmit={(event) => {
                  event.preventDefault();
                  setSearch(searchInput.trim());
                  setPage(1);
                }}
              >
                <input
                  type="search"
                  placeholder="Search name, email, phone…"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  aria-label="Search accounts"
                  className="w-full bg-white border border-gray-300 rounded-full py-2 pl-4 pr-10 text-sm font-medium focus:outline-none focus:border-[#3087C5]"
                />
                <button
                  type="submit"
                  aria-label="Search accounts"
                  className="absolute right-1 bg-[#3087C5] text-white p-2 rounded-full hover:bg-[#256fa4] cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                </button>
              </form>

              {activeTab === "worker" && (
                <Button
                  variant="primary"
                  size="md"
                  onClick={openCreateWorker}
                  className="rounded-full shadow-md font-bold shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Worker</span>
                </Button>
              )}
            </div>
          </div>

          {/* List */}
          {loading ? (
            <ListSkeleton count={3} />
          ) : error ? (
            <ErrorBanner message={error} onRetry={() => void load()} />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={<UserX className="w-10 h-10" />}
              title={`No ${activeTabLabel.toLowerCase()}`}
              description={
                search
                  ? `No accounts matched “${search}”. Try a different name, email, or phone number.`
                  : "There is nothing to show in this tab yet."
              }
              action={
                search ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setSearchInput("");
                      setSearch("");
                      setPage(1);
                    }}
                    className="rounded-full"
                  >
                    Clear Search
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="space-y-4">
              {rows.map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  tab={activeTab}
                  busy={actionId === account.id}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onViewId={openViewId}
                  onViewDetails={openDetails}
                  onEdit={openEditWorker}
                  onRemove={handleRemove}
                  onRestore={handleRestore}
                />
              ))}
              <Pager meta={meta} page={page} noun="accounts" onPage={setPage} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
