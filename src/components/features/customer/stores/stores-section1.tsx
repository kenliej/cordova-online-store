import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import {
  ChevronDown,
  ChevronUp,
  X,
  SlidersHorizontal,
  ShoppingBag,
  Utensils,
  Laptop,
  Sparkles,
  Home,
  HeartPulse,
  Gamepad2,
  Shirt,
  Cpu,
  Package,
  Filter,
  Store as StoreIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { StoreCard } from "@/components/ui/StoreCard";
import { CardGridSkeleton, EmptyState, ErrorBanner } from "@/components/common/Feedback";
import { fetchCategories, fetchStores, getErrorMessage } from "@/lib/api";
import { useBasePath } from "@/lib/useBasePath";
import type { Category, Store, StoreQuery } from "@/lib/types";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "foods": Utensils,
  "foods-beverages": Utensils,
  "electronics": Laptop,
  "beauty": Sparkles,
  "beauty-personal-care": Sparkles,
  "home": Home,
  "home-living": Home,
  "health": HeartPulse,
  "health-wellness": HeartPulse,
  "toys": Gamepad2,
  "toys-games": Gamepad2,
  "sports": Sparkles,
  "sports-outdoors": Sparkles,
  "books": ShoppingBag,
  "books-stationery": ShoppingBag,
  "fashion": Shirt,
  "fashion-apparel": Shirt,
  "computer": Cpu,
  "computer-accessories": Cpu,
  "others": Package,
};

function iconForCategory(category: Category): LucideIcon {
  const slug = category.slug.toLowerCase();
  const nameKey = category.name.toLowerCase().replace(/\s+/g, "-").replace(/&/g, "");
  return CATEGORY_ICONS[slug] ?? CATEGORY_ICONS[nameKey] ?? CATEGORY_ICONS[slug.split("-")[0] ?? ""] ?? Package;
}

type Availability = "all" | "open" | "closed";

export function StoresSection1() {
  const [searchParams, setSearchParams] = useSearchParams();
  const basePath = useBasePath();

  const [categories, setCategories] = useState<Category[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [availability, setAvailability] = useState<Availability>("all");

  const [isCategoryOpen, setIsCategoryOpen] = useState(true);
  const [isAvailabilityOpen, setIsAvailabilityOpen] = useState(true);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const activeCategorySlug = searchParams.get("category") ?? "";

  const activeCategory = useMemo(
    () => categories.find((category) => category.slug === activeCategorySlug) ?? null,
    [categories, activeCategorySlug],
  );

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const data = await fetchCategories("store");
        if (active) setCategories(data);
      } catch {
        /* non-blocking */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const buildQuery = useCallback((): StoreQuery => {
    const query: StoreQuery = { page, perPage: 12 };
    if (activeCategorySlug) query.category = activeCategorySlug;
    if (availability === "open") query.open = true;
    if (availability === "closed") query.closed = true;
    return query;
  }, [activeCategorySlug, availability, page]);

  const loadStores = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await fetchStores(buildQuery());
      setStores(result.items);
      setTotal(result.meta.total);
      setLastPage(result.meta.lastPage);
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Could not load stores. Please try again."));
      setStores([]);
    } finally {
      setIsLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => {
    void loadStores();
  }, [loadStores]);

  const setCategory = (slug: string) => {
    setPage(1);
    const next = new URLSearchParams(searchParams);
    if (slug) next.set("category", slug);
    else next.delete("category");
    setSearchParams(next, { replace: true });
  };

  const changeAvailability = (next: Availability) => {
    setPage(1);
    setAvailability(next);
  };

  const clearFilters = () => {
    setPage(1);
    setAvailability("all");
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const hasActiveFilters = Boolean(activeCategorySlug) || availability !== "all";

  return (
    <section className="bg-[#EBE9E1] w-full py-10 px-4 sm:px-6 relative">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 items-start">
        {/* MOBILE FILTER BUTTON */}
        <div className="w-full lg:hidden">
          <button
            onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
            className="w-full bg-[#3087C5] text-white py-3 px-5 rounded-2xl font-bold flex items-center justify-center space-x-2 shadow-md hover:bg-[#256fa4] transition-colors"
          >
            <Filter className="w-5 h-5" />
            <span>{isMobileFilterOpen ? "Hide Filter Menu" : "Filter Menu"}</span>
          </button>
        </div>

        {/* SIDEBAR FILTERS (#E3DFD3 unified container) */}
        <aside
          className={`w-full lg:w-85 shrink-0 bg-[#E3DFD3] border border-gray-300/80 rounded-2xl p-5 shadow-sm space-y-6 ${
            isMobileFilterOpen ? "block" : "hidden lg:block"
          }`}
        >
          {/* 1. Category Filter Section */}
          <div>
            <div className="flex items-center justify-between cursor-pointer pb-3" onClick={() => setIsCategoryOpen(!isCategoryOpen)}>
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
                  onClick={() => setCategory("")}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 text-xs sm:text-sm font-bold transition-all rounded-none ${
                    !activeCategorySlug
                      ? "bg-white text-gray-900 border-l-4 border-[#3087C5] shadow-xs"
                      : "bg-white/40 text-gray-700 hover:bg-white/70 border-l-4 border-transparent"
                  }`}
                >
                  <ShoppingBag className="w-4 h-4 shrink-0 text-[#3087C5]" />
                  <span className="truncate text-left">All Stores</span>
                </button>

                {categories.map((category) => {
                  const Icon = iconForCategory(category);
                  const isSelected = activeCategorySlug === category.slug;
                  return (
                    <button
                      key={category.id || category.slug}
                      onClick={() => setCategory(category.slug)}
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
              </div>
            )}
          </div>

          {/* 2. Availability Filter Section */}
          <div className="border-t border-gray-300/80 pt-5">
            <div className="flex items-center justify-between cursor-pointer pb-3" onClick={() => setIsAvailabilityOpen(!isAvailabilityOpen)}>
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
                    checked={availability === "all"}
                    onChange={() => changeAvailability("all")}
                    className="w-4 h-4 text-[#3087C5] rounded border-gray-300 focus:ring-[#3087C5]"
                  />
                  <span className="text-xs sm:text-sm font-bold text-gray-800">All Store</span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={availability === "open"}
                    onChange={(event) => changeAvailability(event.target.checked ? "open" : "all")}
                    className="w-4 h-4 text-[#3087C5] rounded border-gray-300 focus:ring-[#3087C5]"
                  />
                  <span className="text-xs sm:text-sm font-bold text-gray-800">Open Now</span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={availability === "closed"}
                    onChange={(event) => changeAvailability(event.target.checked ? "closed" : "all")}
                    className="w-4 h-4 text-[#3087C5] rounded border-gray-300 focus:ring-[#3087C5]"
                  />
                  <span className="text-xs sm:text-sm font-bold text-gray-800">Closed</span>
                </label>
              </div>
            )}
          </div>
        </aside>

        {/* STORES GRID RESULTS */}
        <div className="flex-1 w-full">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-6 bg-white/60 backdrop-blur-xs p-4 rounded-2xl border border-gray-300/60 shadow-xs">
            <h2 className="text-lg font-black text-gray-900">
              Showing Stores <span className="text-[#3087C5]">({total})</span>
            </h2>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs font-bold text-sky-600 hover:underline flex items-center space-x-1"
              >
                <span>Clear All Filters</span>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {isLoading && <CardGridSkeleton count={6} className="lg:grid-cols-3" />}

          {!isLoading && error && <ErrorBanner message={error} onRetry={() => void loadStores()} />}

          {!isLoading && !error && stores.length === 0 && (
            <EmptyState
              icon={<StoreIcon className="w-12 h-12" />}
              title="No stores found"
              description="Try adjusting your filters or category selection."
              action={
                hasActiveFilters ? (
                  <button
                    onClick={clearFilters}
                    className="bg-[#3087C5] text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-[#256fa4] transition-colors"
                  >
                    Clear All Filters
                  </button>
                ) : undefined
              }
            />
          )}

          {!isLoading && !error && stores.length > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {stores.map((store) => (
                  <StoreCard key={store.id} store={store} basePath={basePath} />
                ))}
              </div>

              {lastPage > 1 && (
                <div className="mt-8 flex items-center justify-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page <= 1}
                    className="px-4 py-2 rounded-full border border-gray-300 bg-white text-xs font-bold text-gray-700 disabled:opacity-40 hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <span className="px-3 text-xs font-bold text-gray-600">
                    Page {page} of {lastPage}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.min(lastPage, current + 1))}
                    disabled={page >= lastPage}
                    className="px-4 py-2 rounded-full border border-gray-300 bg-white text-xs font-bold text-gray-700 disabled:opacity-40 hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}

          {activeCategory && (
            <p className="mt-6 text-center text-[11px] font-semibold text-gray-500">
              Browsing{" "}
              <span className="font-black text-gray-700">{activeCategory.displayName || activeCategory.name}</span> ·{" "}
              {total} store{total === 1 ? "" : "s"}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
