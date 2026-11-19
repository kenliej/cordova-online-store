import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Cpu,
  Filter,
  Gamepad2,
  HeartPulse,
  Home,
  Laptop,
  Package,
  Plus,
  Search,
  Shirt,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Utensils,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CardGridSkeleton,
  EmptyState,
  ErrorBanner,
} from "@/components/common/Feedback";
import { useToast } from "@/components/common/Toast";
import { WorkerProductCard } from "@/components/ui/WorkerProductCard";
import { EditProductModal } from "@/components/ui/EditProductModal";
import { api, getErrorMessage } from "@/lib/api";
import type { Category, PaginationMeta, WorkerProduct, WorkerProductPayload } from "@/lib/types";

type ProductModalMode = "create" | "update" | "view";

const CATEGORY_ICONS: { match: RegExp; icon: LucideIcon }[] = [
  { match: /food|beverage|snack/i, icon: Utensils },
  { match: /electronic|gadget/i, icon: Laptop },
  { match: /beauty|personal care|cosmetic/i, icon: Sparkles },
  { match: /home|living|furniture/i, icon: Home },
  { match: /health|wellness/i, icon: HeartPulse },
  { match: /toy|game/i, icon: Gamepad2 },
  { match: /sport|outdoor/i, icon: Sparkles },
  { match: /book|stationery/i, icon: ShoppingBag },
  { match: /fashion|apparel|clothing/i, icon: Shirt },
  { match: /computer|accessor|cpu/i, icon: Cpu },
];

function iconForCategory(name: string): LucideIcon {
  return CATEGORY_ICONS.find((entry) => entry.match.test(name))?.icon ?? ShoppingBag;
}

const PER_PAGE = 12;

export default function WorkerProducts() {
  const toast = useToast();

  const [products, setProducts] = useState<WorkerProduct[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [priceSort, setPriceSort] = useState<"high-to-low" | "low-to-high" | null>(null);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [outOfStockOnly, setOutOfStockOnly] = useState(false);

  const [isCategoryOpen, setIsCategoryOpen] = useState(true);
  const [isPriceOpen, setIsPriceOpen] = useState(true);
  const [isAvailabilityOpen, setIsAvailabilityOpen] = useState(true);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const [modal, setModal] = useState<{
    open: boolean;
    mode: ProductModalMode;
    product: WorkerProduct | null;
  }>({ open: false, mode: "create", product: null });
  const [deletingId, setDeletingId] = useState<number | null>(null);
  /** Guards against stale list responses when filters/page change fast. */
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const request = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const result = await api.worker.products({
        category: selectedCategory === "all" ? undefined : selectedCategory,
        search: search.trim() || undefined,
        sort:
          priceSort === "high-to-low"
            ? "price_desc"
            : priceSort === "low-to-high"
              ? "price_asc"
              : undefined,
        inStock: inStockOnly ? true : undefined,
        outOfStock: outOfStockOnly ? true : undefined,
        page,
        perPage: PER_PAGE,
      });
      if (request !== requestId.current) return;
      setProducts(result.items);
      setMeta(result.meta);
    } catch (caught) {
      if (request !== requestId.current) return;
      setProducts([]);
      setMeta(null);
      setError(getErrorMessage(caught));
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }, [selectedCategory, search, priceSort, inStockOnly, outOfStockOnly, page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let active = true;
    api.catalog
      .categories("product")
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

  const resetFilters = () => {
    setSelectedCategory("all");
    setSearchInput("");
    setSearch("");
    setPriceSort(null);
    setInStockOnly(false);
    setOutOfStockOnly(false);
    setPage(1);
  };

  const toggleInStock = (checked: boolean) => {
    setInStockOnly(checked);
    if (checked) setOutOfStockOnly(false);
    setPage(1);
  };

  const toggleOutOfStock = (checked: boolean) => {
    setOutOfStockOnly(checked);
    if (checked) setInStockOnly(false);
    setPage(1);
  };

  const hasActiveFilters =
    selectedCategory !== "all" ||
    search !== "" ||
    priceSort !== null ||
    inStockOnly ||
    outOfStockOnly;

  /* ------------------------------------------------------------------ */
  /* Mutations                                                          */
  /* ------------------------------------------------------------------ */

  const openCreate = () => setModal({ open: true, mode: "create", product: null });
  const openEdit = (product: WorkerProduct) => setModal({ open: true, mode: "update", product });
  const openView = (product: WorkerProduct) => setModal({ open: true, mode: "view", product });
  const closeModal = () => setModal({ open: false, mode: "create", product: null });

  const handleSubmit = async (payload: WorkerProductPayload) => {
    if (modal.mode === "update" && modal.product) {
      await api.worker.updateProduct(modal.product.id, payload);
      toast.success(`Successfully updated "${payload.name}"!`);
    } else {
      await api.worker.createProduct(payload);
      toast.success(`Successfully added "${payload.name}" to inventory!`);
    }
    closeModal();
    await load();
  };

  const handleDelete = async (product: WorkerProduct) => {
    if (!window.confirm(`Delete "${product.name}"? It will be removed from the catalog.`)) return;
    setDeletingId(product.id);
    try {
      await api.worker.deleteProduct(product.id);
      toast.success(`Deleted "${product.name}" from inventory.`);
      await load();
    } catch (caught) {
      toast.error(getErrorMessage(caught));
    } finally {
      setDeletingId(null);
    }
  };

  const productCount = meta?.total ?? products.length;
  const handlePage = (nextPage: number) => {
    if (!meta) return;
    setPage(Math.min(Math.max(1, nextPage), meta.lastPage));
  };

  return (
    <section className="bg-[#EBE9E1] w-full py-10 px-4 sm:px-6 relative font-sans min-h-screen">
      {/* Product create / edit / view modal */}
      <EditProductModal
        isOpen={modal.open}
        onClose={closeModal}
        product={modal.product}
        mode={modal.mode}
        categories={categories}
        onSubmit={handleSubmit}
      />

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 items-start">
        {/* MOBILE FILTER BUTTON */}
        <div className="w-full lg:hidden">
          <button
            onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
            className="w-full bg-[#3087C5] text-white py-3 px-5 rounded-2xl font-bold flex items-center justify-center space-x-2 shadow-md hover:bg-[#256fa4] transition-colors"
          >
            <Filter className="w-5 h-5" />
            <span>{isMobileFilterOpen ? "Hide Filter Products" : "Filter Products"}</span>
          </button>
        </div>

        {/* SIDEBAR FILTERS */}
        <aside
          className={`w-full lg:w-85 shrink-0 bg-[#E3DFD3] border border-gray-300/80 rounded-2xl p-5 shadow-sm space-y-6 ${
            isMobileFilterOpen ? "block" : "hidden lg:block"
          }`}
        >
          {/* 1. Category */}
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
                  <span className="truncate text-left">All Products</span>
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
                    {categoriesError
                      ? "Categories unavailable right now."
                      : "No product categories found."}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 2. Price range */}
          <div className="border-t border-gray-300/80 pt-5">
            <div
              className="flex items-center justify-between cursor-pointer pb-3"
              onClick={() => setIsPriceOpen(!isPriceOpen)}
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#3087C5] text-white flex items-center justify-center shadow-xs">
                  <span className="font-black text-xs">₱</span>
                </div>
                <h3 className="font-black text-gray-900 text-base">Price Range</h3>
              </div>
              <button className="text-gray-600 hover:text-gray-900" aria-label="Toggle price filter">
                {isPriceOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>

            {isPriceOpen && (
              <div className="mt-2 space-y-0 border-t border-gray-300/65">
                <button
                  onClick={() => {
                    setPriceSort(priceSort === "high-to-low" ? null : "high-to-low");
                    setPage(1);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-xs sm:text-sm font-bold transition-all rounded-none ${
                    priceSort === "high-to-low"
                      ? "bg-white text-gray-900 border-l-4 border-[#3087C5] shadow-xs"
                      : "bg-white/40 text-gray-700 hover:bg-white/70 border-l-4 border-transparent"
                  }`}
                >
                  <span className="flex items-center space-x-2">
                    <span className="text-[#3087C5] font-black">↑</span>
                    <span>Highest to Lowest</span>
                  </span>
                  {priceSort === "high-to-low" && <Check className="w-4 h-4 text-[#3087C5]" />}
                </button>

                <button
                  onClick={() => {
                    setPriceSort(priceSort === "low-to-high" ? null : "low-to-high");
                    setPage(1);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-xs sm:text-sm font-bold transition-all rounded-none ${
                    priceSort === "low-to-high"
                      ? "bg-white text-gray-900 border-l-4 border-[#3087C5] shadow-xs"
                      : "bg-white/40 text-gray-700 hover:bg-white/70 border-l-4 border-transparent"
                  }`}
                >
                  <span className="flex items-center space-x-2">
                    <span className="text-[#3087C5] font-black">↓</span>
                    <span>Lowest to Highest</span>
                  </span>
                  {priceSort === "low-to-high" && <Check className="w-4 h-4 text-[#3087C5]" />}
                </button>
              </div>
            )}
          </div>

          {/* 3. Availability */}
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
              <div className="mt-2 space-y-3 border-t border-gray-300/65 pt-3">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(event) => toggleInStock(event.target.checked)}
                    className="w-4 h-4 text-[#3087C5] rounded border-gray-300 focus:ring-[#3087C5]"
                  />
                  <span className="text-xs sm:text-sm font-bold text-gray-800">In Stock</span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={outOfStockOnly}
                    onChange={(event) => toggleOutOfStock(event.target.checked)}
                    className="w-4 h-4 text-[#3087C5] rounded border-gray-300 focus:ring-[#3087C5]"
                  />
                  <span className="text-xs sm:text-sm font-bold text-gray-800">Out of Stock</span>
                </label>
              </div>
            )}
          </div>
        </aside>

        {/* PRODUCTS AREA */}
        <div className="flex-1 w-full space-y-6">
          {/* Top Bar */}
          <div className="bg-white/60 backdrop-blur-xs p-4 rounded-2xl border border-gray-300/60 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <h2 className="text-xl font-black text-[#3087C5]">
              Products <span className="text-xs font-bold text-gray-500 ml-1">({productCount})</span>
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
                placeholder="Search products..."
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                aria-label="Search products"
                className="w-full bg-white border border-gray-300 rounded-full py-2 pl-4 pr-10 text-sm font-medium focus:outline-none focus:border-[#3087C5]"
              />
              <Search className="absolute right-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
            </form>

            <Button
              variant="primary"
              size="md"
              onClick={openCreate}
              className="rounded-full shadow-md font-bold uppercase text-xs tracking-wider w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              <span>New Product</span>
            </Button>
          </div>

          {/* Reset filters prompt */}
          {hasActiveFilters && (
            <div className="flex items-center justify-between bg-white/40 px-4 py-2 rounded-xl text-xs font-bold text-gray-600">
              <span>
                Showing filtered results
                {outOfStockOnly && " (out-of-stock scan limited to 50 products)"}
              </span>
              <button
                onClick={resetFilters}
                className="text-[#3087C5] hover:underline flex items-center space-x-1"
              >
                <span>Clear Filters</span>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Products grid */}
          {loading ? (
            <CardGridSkeleton count={6} className="lg:grid-cols-2 xl:grid-cols-3" />
          ) : error ? (
            <ErrorBanner message={error} onRetry={() => void load()} />
          ) : products.length === 0 ? (
            <EmptyState
              icon={<Package className="w-10 h-10" />}
              title="No products found"
              description="Try adjusting your filter or search query."
              action={
                <Button variant="primary" size="sm" onClick={resetFilters} className="rounded-full">
                  Reset View
                </Button>
              }
            />
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {products.map((product) => (
                  <WorkerProductCard
                    key={product.id}
                    product={product}
                    onEdit={openEdit}
                    onView={openView}
                    onDelete={(selected) => void handleDelete(selected)}
                    deleting={deletingId === product.id}
                  />
                ))}
              </div>

              {meta && meta.lastPage > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white/60 backdrop-blur-xs px-4 py-3 rounded-2xl border border-gray-300/60 shadow-xs">
                  <p className="text-xs font-bold text-gray-600">
                    Page {meta.currentPage} of {meta.lastPage} · {meta.total.toLocaleString()} products
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
            </>
          )}
        </div>
      </div>
    </section>
  );
}
