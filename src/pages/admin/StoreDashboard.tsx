import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Cpu,
  Eye,
  Filter,
  Gamepad2,
  HeartPulse,
  Home,
  Laptop,
  Package,
  Phone,
  Plus,
  Search,
  Settings,
  Shirt,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorBanner, ListSkeleton } from "@/components/common/Feedback";
import { useToast } from "@/components/common/Toast";
import { AdminStoreModal, type StoreFormValues } from "@/components/ui/AdminStoreModal";
import { api, getErrorMessage } from "@/lib/api";
import type { AdminStore, Category, PaginationMeta } from "@/lib/types";

const PER_PAGE = 10;

const CATEGORY_ICONS: { match: RegExp; icon: LucideIcon }[] = [
  { match: /food|beverage|restaurant|snack/i, icon: Utensils },
  { match: /electronic|laptop|computer|gadget/i, icon: Laptop },
  { match: /beauty|personal care|cosmetic/i, icon: Sparkles },
  { match: /home|living|furniture/i, icon: Home },
  { match: /health|wellness|pharmacy/i, icon: HeartPulse },
  { match: /toy|game/i, icon: Gamepad2 },
  { match: /sport|outdoor/i, icon: Sparkles },
  { match: /book|stationery/i, icon: ShoppingBag },
  { match: /fashion|apparel|clothing/i, icon: Shirt },
  { match: /cpu|accessor/i, icon: Cpu },
];

function iconForCategory(name: string): LucideIcon {
  return CATEGORY_ICONS.find((entry) => entry.match.test(name))?.icon ?? ShoppingBag;
}

interface PagerProps {
  meta: PaginationMeta | null;
  page: number;
  onPage: (page: number) => void;
}

function Pager({ meta, page, onPage }: PagerProps) {
  if (!meta || meta.lastPage <= 1) return null;
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white/60 backdrop-blur-xs px-4 py-3 rounded-2xl border border-gray-300/60 shadow-xs">
      <p className="text-xs font-bold text-gray-600">
        Page {meta.currentPage} of {meta.lastPage} · {meta.total.toLocaleString()} stores
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

export default function StoreDashboard() {
  const toast = useToast();

  const [stores, setStores] = useState<AdminStore[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState("all");

  const [allStoreCheck, setAllStoreCheck] = useState(true);
  const [openNowCheck, setOpenNowCheck] = useState(false);
  const [closedCheck, setClosedCheck] = useState(false);

  const [isCategoryOpen, setIsCategoryOpen] = useState(true);
  const [isAvailabilityOpen, setIsAvailabilityOpen] = useState(true);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "update" | "view">("create");
  const [selectedStore, setSelectedStore] = useState<AdminStore | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  /** Guards against stale list responses when filters/page change fast. */
  const requestId = useRef(0);

  const isOpenFilter = allStoreCheck ? undefined : openNowCheck ? true : closedCheck ? false : undefined;

  /* ------------------------------------------------------------------ */
  /* Data loading                                                       */
  /* ------------------------------------------------------------------ */

  const load = useCallback(async () => {
    const request = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const result = await api.admin.stores({
        search: search.trim() || undefined,
        category: selectedCategory === "all" ? undefined : selectedCategory,
        isOpen: isOpenFilter,
        page,
        perPage: PER_PAGE,
      });
      if (request !== requestId.current) return;
      setStores(result.items);
      setMeta(result.meta);
    } catch (caught) {
      if (request !== requestId.current) return;
      setStores([]);
      setMeta(null);
      setError(getErrorMessage(caught));
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }, [search, selectedCategory, isOpenFilter, page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let active = true;
    api.catalog
      .categories("store")
      .then((result) => {
        if (active) setCategories(result);
      })
      .catch((caught: unknown) => {
        if (active) setCategoriesError(getErrorMessage(caught));
      });
    return () => {
      active = false;
    };
  }, []);

  // Debounced search (350 ms) — resets to the first page.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  /* ------------------------------------------------------------------ */
  /* Filters                                                            */
  /* ------------------------------------------------------------------ */

  const handleAllStoreToggle = (checked: boolean) => {
    setAllStoreCheck(checked);
    if (checked) {
      setOpenNowCheck(false);
      setClosedCheck(false);
    }
    setPage(1);
  };

  const handleAvailabilityToggle = (which: "open" | "closed", checked: boolean) => {
    const nextOpen = which === "open" ? checked : openNowCheck;
    const nextClosed = which === "closed" ? checked : closedCheck;
    setOpenNowCheck(nextOpen);
    setClosedCheck(nextClosed);
    setAllStoreCheck(!nextOpen && !nextClosed);
    setPage(1);
  };

  const resetFilters = () => {
    setSelectedCategory("all");
    setSearchInput("");
    setSearch("");
    setAllStoreCheck(true);
    setOpenNowCheck(false);
    setClosedCheck(false);
    setPage(1);
  };

  /* ------------------------------------------------------------------ */
  /* Mutations                                                          */
  /* ------------------------------------------------------------------ */

  const handleModalSubmit = async (values: StoreFormValues) => {
    if (modalMode === "create" || !selectedStore) {
      await api.admin.createStore(values);
      toast.success(`Successfully added "${values.name}"!`);
    } else {
      await api.admin.updateStore(selectedStore.id, values);
      toast.success(`Successfully updated "${values.name}"!`);
    }
    setIsModalOpen(false);
    setSelectedStore(null);
    await load();
  };

  const handleDeleteStore = async (store: AdminStore) => {
    if (!window.confirm(`Are you sure you want to delete ${store.name}?`)) return;
    setDeletingId(store.id);
    try {
      await api.admin.deleteStore(store.id);
      toast.success(`Deleted "${store.name}" from stores.`);
      await load();
    } catch (caught) {
      toast.error(getErrorMessage(caught));
    } finally {
      setDeletingId(null);
    }
  };

  const openModal = (mode: "create" | "update" | "view", store: AdminStore | null) => {
    setModalMode(mode);
    setSelectedStore(store);
    setIsModalOpen(true);
  };

  const storeCount = meta?.total ?? stores.length;

  return (
    <section className="bg-[#EBE9E1] w-full py-10 px-4 sm:px-6 relative font-sans min-h-screen">
      {/* Admin Store Modal */}
      <AdminStoreModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedStore(null);
        }}
        store={selectedStore}
        mode={modalMode}
        categories={categories}
        onSubmit={handleModalSubmit}
      />

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 items-start">
        {/* MOBILE FILTER BUTTON */}
        <div className="w-full lg:hidden">
          <button
            onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
            className="w-full bg-[#3087C5] text-white py-3 px-5 rounded-2xl font-bold flex items-center justify-center space-x-2 shadow-md hover:bg-[#256fa4]"
          >
            <Filter className="w-5 h-5" />
            <span>{isMobileFilterOpen ? "Hide Filter Menu" : "Filter Menu"}</span>
          </button>
        </div>

        {/* SIDEBAR FILTERS */}
        <aside
          className={`w-full lg:w-85 shrink-0 bg-[#E3DFD3] border border-gray-300/80 rounded-2xl p-5 shadow-sm space-y-6 ${
            isMobileFilterOpen ? "block" : "hidden lg:block"
          }`}
        >
          {/* Categories */}
          <div>
            <div
              className="flex items-center justify-between cursor-pointer pb-3"
              onClick={() => setIsCategoryOpen(!isCategoryOpen)}
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#3087C5] text-white flex items-center justify-center shadow-xs">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <h3 className="font-black text-gray-900 text-base">Category</h3>
              </div>
              <button className="text-gray-600 hover:text-gray-900" aria-label="Toggle category filter">
                {isCategoryOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>

            {isCategoryOpen && (
              <div className="mt-2 space-y-0 border-t border-gray-300/60 max-h-[380px] overflow-y-auto">
                <button
                  onClick={() => {
                    setSelectedCategory("all");
                    setPage(1);
                  }}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 text-xs sm:text-sm font-bold transition-all rounded-none ${
                    selectedCategory === "all"
                      ? "bg-white text-gray-900 border-l-4 border-[#3087C5] shadow-xs"
                      : "bg-white/40 text-gray-700 hover:bg-white/70 border-l-4 border-transparent"
                  }`}
                >
                  <ShoppingBag className="w-4 h-4 shrink-0 text-[#3087C5]" />
                  <span className="truncate text-left">All Stores</span>
                </button>

                {categories.map((category) => {
                  const Icon = iconForCategory(category.displayName || category.name);
                  const isSelected = selectedCategory === category.slug;
                  return (
                    <button
                      key={category.id}
                      onClick={() => {
                        setSelectedCategory(category.slug);
                        setPage(1);
                      }}
                      className={`w-full flex items-center space-x-3 px-3 py-2.5 text-xs sm:text-sm font-bold transition-all rounded-none ${
                        isSelected
                          ? "bg-white text-gray-900 border-l-4 border-[#3087C5] shadow-xs"
                          : "bg-white/40 text-gray-700 hover:bg-white/70 border-l-4 border-transparent"
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0 text-[#3087C5]" />
                      <span className="truncate text-left">{category.displayName || category.name}</span>
                    </button>
                  );
                })}

                {categories.length === 0 && (
                  <p className="px-3 py-2.5 text-[11px] font-semibold text-gray-500">
                    {categoriesError ? "Categories unavailable right now." : "No store categories found."}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Availability */}
          <div className="border-t border-gray-300/80 pt-5">
            <div
              className="flex items-center justify-between cursor-pointer pb-3"
              onClick={() => setIsAvailabilityOpen(!isAvailabilityOpen)}
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#3087C5] text-white flex items-center justify-center shadow-xs">
                  <Package className="w-4 h-4" />
                </div>
                <h3 className="font-black text-gray-900 text-base">Availability</h3>
              </div>
              <button className="text-gray-600 hover:text-gray-900" aria-label="Toggle availability filter">
                {isAvailabilityOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>

            {isAvailabilityOpen && (
              <div className="mt-2 space-y-3 border-t border-gray-300/60 pt-3">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allStoreCheck}
                    onChange={(event) => handleAllStoreToggle(event.target.checked)}
                    className="w-4 h-4 text-[#3087C5] rounded border-gray-300 focus:ring-[#3087C5]"
                  />
                  <span className="text-xs sm:text-sm font-bold text-gray-800">All Store</span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={openNowCheck}
                    onChange={(event) => handleAvailabilityToggle("open", event.target.checked)}
                    className="w-4 h-4 text-[#3087C5] rounded border-gray-300 focus:ring-[#3087C5]"
                  />
                  <span className="text-xs sm:text-sm font-bold text-gray-800">Open Now</span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={closedCheck}
                    onChange={(event) => handleAvailabilityToggle("closed", event.target.checked)}
                    className="w-4 h-4 text-[#3087C5] rounded border-gray-300 focus:ring-[#3087C5]"
                  />
                  <span className="text-xs sm:text-sm font-bold text-gray-800">Closed</span>
                </label>
              </div>
            )}
          </div>
        </aside>

        {/* STORES CONTENT */}
        <div className="flex-1 w-full space-y-6">
          {/* Top Bar */}
          <div className="bg-white/60 backdrop-blur-xs p-4 rounded-2xl border border-gray-300/60 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <h2 className="text-xl font-black text-[#3087C5]">
              Stores <span className="text-xs font-bold text-gray-500 ml-1">({storeCount})</span>
            </h2>

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
                placeholder="Search stores..."
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                aria-label="Search stores"
                className="w-full bg-white border border-gray-300 rounded-full py-2 pl-4 pr-10 text-sm font-medium focus:outline-none focus:border-[#3087C5]"
              />
              <Search className="absolute right-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
            </form>

            <Button
              variant="primary"
              size="md"
              onClick={() => openModal("create", null)}
              className="rounded-full shadow-md font-bold uppercase text-xs tracking-wider w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              <span>New Store</span>
            </Button>
          </div>

          {/* Stores List */}
          {loading ? (
            <ListSkeleton count={4} />
          ) : error ? (
            <ErrorBanner message={error} onRetry={() => void load()} />
          ) : stores.length === 0 ? (
            <EmptyState
              icon={<Package className="w-10 h-10" />}
              title="No stores found"
              description="Try adjusting your filters or search query."
              action={
                <Button variant="primary" size="sm" onClick={resetFilters} className="rounded-full">
                  Reset Filters
                </Button>
              }
            />
          ) : (
            <div className="space-y-4">
              {stores.map((store) => (
                <div
                  key={store.id}
                  className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-5"
                >
                  <div className="flex items-center space-x-5 w-full sm:w-auto">
                    <div className="w-28 h-28 rounded-2xl bg-gray-50 overflow-hidden border border-gray-200 shrink-0 flex items-center justify-center">
                      {store.image ? (
                        <img
                          src={store.image}
                          alt={store.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <ShoppingBag className="w-9 h-9 text-gray-400" />
                      )}
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-black text-gray-900 text-lg truncate">{store.name}</h3>
                        <span
                          className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                            store.isOpen
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-gray-200 text-gray-600"
                          }`}
                        >
                          {store.isOpen ? "Open" : "Closed"}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-[#3087C5]">{store.category || "Uncategorized"}</p>
                      <p className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#3087C5]" />
                        <span>Open: {store.operatingHours || "—"}</span>
                      </p>
                      <p className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-[#3087C5]" />
                        <span>{store.phone || "—"}</span>
                      </p>
                      {store.floorLocation && (
                        <p className="text-xs font-semibold text-gray-500">Location: {store.floorLocation}</p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center justify-end gap-2.5 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => openModal("update", store)}
                      className="rounded-full font-bold shadow-xs px-4"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>Update Store</span>
                    </Button>

                    <Button
                      variant="white"
                      size="sm"
                      onClick={() => openModal("view", store)}
                      className="rounded-full font-bold border-gray-300 text-gray-800 hover:bg-gray-50 shadow-xs px-4"
                    >
                      <Eye className="w-3.5 h-3.5 text-gray-600" />
                      <span>View Store</span>
                    </Button>

                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => void handleDeleteStore(store)}
                      loading={deletingId === store.id}
                      disabled={deletingId !== null && deletingId !== store.id}
                      className="rounded-full font-bold shadow-xs px-4"
                    >
                      {deletingId !== store.id && <Trash2 className="w-3.5 h-3.5" />}
                      <span>Delete Store</span>
                    </Button>
                  </div>
                </div>
              ))}

              <Pager meta={meta} page={page} onPage={setPage} />

              <p className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-gray-500">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Showing {stores.length} of {storeCount} store(s)
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
