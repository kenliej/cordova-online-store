import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import {
  ChevronDown,
  ChevronUp,
  X,
  Check,
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
  PackageSearch,
} from "lucide-react";
import { ProductCard } from "@/components/ui/ProductCard";
import { CardGridSkeleton, EmptyState, ErrorBanner } from "@/components/common/Feedback";
import { useToast } from "@/components/common/Toast";
import { useAuth } from "@/context/AuthContext";
import { addCartItem, fetchCategories, fetchProducts, getErrorMessage } from "@/lib/api";
import { useBasePath } from "@/lib/useBasePath";
import type { Category, Product, ProductQuery } from "@/lib/types";
import type { LucideIcon } from "lucide-react";

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

type PriceSort = "high-to-low" | "low-to-high" | null;

export function ProductsSection1() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = useBasePath();
  const { user, refreshCartCount } = useAuth();
  const toast = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [addingId, setAddingId] = useState<number | null>(null);

  const [priceSort, setPriceSort] = useState<PriceSort>(null);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [outOfStockOnly, setOutOfStockOnly] = useState(false);

  const [isCategoryOpen, setIsCategoryOpen] = useState(true);
  const [isPriceOpen, setIsPriceOpen] = useState(true);
  const [isAvailabilityOpen, setIsAvailabilityOpen] = useState(true);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const activeCategorySlug = searchParams.get("category") ?? "";
  const activeSearch = searchParams.get("search") ?? "";

  const activeCategory = useMemo(
    () => categories.find((category) => category.slug === activeCategorySlug) ?? null,
    [categories, activeCategorySlug],
  );

  const loadCategories = useCallback(async () => {
    try {
      setCategories(await fetchCategories("product"));
    } catch {
      /* non-blocking: the All Products option still works */
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const buildQuery = useCallback((): ProductQuery => {
    const query: ProductQuery = { page, perPage: 12 };
    if (activeCategorySlug) query.category = activeCategorySlug;
    if (activeSearch) query.search = activeSearch;
    if (priceSort === "high-to-low") query.sort = "price_desc";
    if (priceSort === "low-to-high") query.sort = "price_asc";
    if (inStockOnly && !outOfStockOnly) query.inStock = true;
    if (outOfStockOnly && !inStockOnly) query.outOfStock = true;
    return query;
  }, [activeCategorySlug, activeSearch, inStockOnly, outOfStockOnly, page, priceSort]);

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await fetchProducts(buildQuery());
      setProducts(result.items);
      setTotal(result.meta.total);
      setLastPage(result.meta.lastPage);
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Could not load products. Please try again."));
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  // Any filter change starts back at page 1.
  const updateFilter = (updater: () => void) => {
    setPage(1);
    updater();
  };

  const setCategory = (slug: string) => {
    updateFilter(() => {
      const next = new URLSearchParams(searchParams);
      if (slug) next.set("category", slug);
      else next.delete("category");
      setSearchParams(next, { replace: true });
    });
  };

  const clearFilters = () => {
    setPage(1);
    setPriceSort(null);
    setInStockOnly(false);
    setOutOfStockOnly(false);
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const togglePriceSort = (next: Exclude<PriceSort, null>) => {
    updateFilter(() => setPriceSort((current) => (current === next ? null : next)));
  };

  const toggleAvailability = (kind: "in" | "out", checked: boolean) => {
    updateFilter(() => {
      if (kind === "in") {
        setInStockOnly(checked);
        if (checked) setOutOfStockOnly(false);
      } else {
        setOutOfStockOnly(checked);
        if (checked) setInStockOnly(false);
      }
    });
  };

  const handleAddToCart = async (product: Product, quantity: number) => {
    if (!user) {
      navigate("/login", { state: { from: location.pathname + location.search } });
      return;
    }
    setAddingId(product.id);
    try {
      await addCartItem(product.id, quantity);
      toast.success(`Added ${quantity} x "${product.name}" to cart!`);
      await refreshCartCount();
    } catch (addError) {
      toast.error(getErrorMessage(addError, `Could not add "${product.name}" to your cart.`));
    } finally {
      setAddingId(null);
    }
  };

  const hasActiveFilters = Boolean(activeCategorySlug || activeSearch || priceSort || inStockOnly || outOfStockOnly);

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
            <span>{isMobileFilterOpen ? "Hide Filter Products" : "Filter Products"}</span>
          </button>
        </div>

        {/* SIDEBAR FILTERS (#E3DFD3 unified background container) */}
        <aside
          className={`w-full lg:w-85 shrink-0 bg-[#E3DFD3] border border-gray-300/80 rounded-2xl p-5 shadow-sm space-y-6 ${
            isMobileFilterOpen ? "block" : "hidden lg:block"
          }`}
        >
          {/* 1. Category Section */}
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
                  <span className="truncate text-left">All Products</span>
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

          {/* 2. Price Range Section */}
          <div className="border-t border-gray-300/80 pt-5">
            <div className="flex items-center justify-between cursor-pointer pb-3" onClick={() => setIsPriceOpen(!isPriceOpen)}>
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
              <div className="mt-2 space-y-0 border-t border-gray-300/60">
                <button
                  onClick={() => togglePriceSort("high-to-low")}
                  aria-pressed={priceSort === "high-to-low"}
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
                  onClick={() => togglePriceSort("low-to-high")}
                  aria-pressed={priceSort === "low-to-high"}
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

          {/* 3. Availability Section */}
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
                    checked={inStockOnly}
                    onChange={(event) => toggleAvailability("in", event.target.checked)}
                    className="w-4 h-4 text-[#3087C5] rounded border-gray-300 focus:ring-[#3087C5]"
                  />
                  <span className="text-xs sm:text-sm font-bold text-gray-800">In Stock</span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={outOfStockOnly}
                    onChange={(event) => toggleAvailability("out", event.target.checked)}
                    className="w-4 h-4 text-[#3087C5] rounded border-gray-300 focus:ring-[#3087C5]"
                  />
                  <span className="text-xs sm:text-sm font-bold text-gray-800">Out of Stock</span>
                </label>
              </div>
            )}
          </div>
        </aside>

        {/* PRODUCTS GRID RESULTS */}
        <div className="flex-1 w-full">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-6 bg-white/60 backdrop-blur-xs p-4 rounded-2xl border border-gray-300/60 shadow-xs">
            <h2 className="text-lg font-black text-gray-900">
              Showing Results <span className="text-[#3087C5]">({total})</span>
              {activeSearch && (
                <span className="ml-2 text-xs font-bold text-gray-500">for “{activeSearch}”</span>
              )}
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

          {!isLoading && error && <ErrorBanner message={error} onRetry={() => void loadProducts()} />}

          {!isLoading && !error && products.length === 0 && (
            <EmptyState
              icon={<PackageSearch className="w-12 h-12" />}
              title="No products found"
              description="Try adjusting your search, filters or category selection."
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

          {!isLoading && !error && products.length > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    basePath={basePath}
                    onAddToCart={(item, quantity) => void handleAddToCart(item, quantity)}
                    adding={addingId === product.id}
                  />
                ))}
              </div>

              {/* Pagination */}
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
              {total} item{total === 1 ? "" : "s"}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
