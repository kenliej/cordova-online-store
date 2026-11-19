import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { ChevronLeft, ChevronRight, ArrowRight, ShoppingCart, CheckCircle2, XCircle, PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorBanner, LoadingState } from "@/components/common/Feedback";
import { useToast } from "@/components/common/Toast";
import { useAuth } from "@/context/AuthContext";
import { addCartItem, getErrorMessage } from "@/lib/api";
import { formatPesoSpaced } from "@/lib/format";
import { useBasePath } from "@/lib/useBasePath";
import type { Product } from "@/lib/types";

interface HomeSection2Props {
  products: Product[];
  loading: boolean;
  error: string;
  onRetry: () => void;
}

export function HomeSection2({ products, loading, error, onRetry }: HomeSection2Props) {
  const basePath = useBasePath();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, refreshCartCount } = useAuth();
  const toast = useToast();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [addingId, setAddingId] = useState<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto loop carousel timer (changes every 3.5 seconds)
  useEffect(() => {
    if (products.length === 0) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % products.length);
    }, 3500);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [currentIndex, products.length]);

  const handlePrev = () => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? products.length - 1 : prevIndex - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % products.length);
  };

  const handleAddToCart = useCallback(
    async (product: Product) => {
      if (!user) {
        navigate("/login", { state: { from: location.pathname } });
        return;
      }
      if (!product.inStock) return;
      setAddingId(product.id);
      try {
        await addCartItem(product.id, 1);
        toast.success(`Added "${product.name}" to cart!`);
        await refreshCartCount();
      } catch (addError) {
        toast.error(getErrorMessage(addError, "Could not add this product to your cart."));
      } finally {
        setAddingId(null);
      }
    },
    [location.pathname, navigate, refreshCartCount, toast, user],
  );

  return (
    <section className="max-w-7xl mx-auto py-12 px-4 sm:px-6">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Featured Products</h2>
        <Link
          to={`${basePath}/products`}
          className="flex items-center space-x-1 text-sm font-bold text-sky-600 hover:text-sky-700 transition-colors group"
        >
          <span>View All</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {loading && <LoadingState label="Loading featured products…" />}
      {!loading && error && <ErrorBanner message={error} onRetry={onRetry} />}
      {!loading && !error && products.length === 0 && (
        <EmptyState
          icon={<PackageOpen className="w-10 h-10" />}
          title="No featured products yet"
          description="New arrivals will show up here as soon as the mall publishes them."
        />
      )}

      {!loading && !error && products.length > 0 && (
        <>
          <div className="relative group">
            {/* Left Arrow Button */}
            <button
              type="button"
              onClick={handlePrev}
              className="absolute -left-3 sm:-left-5 top-1/2 -translate-y-1/2 z-20 bg-white/90 hover:bg-white text-gray-800 p-2 sm:p-2.5 rounded-full shadow-lg border border-gray-200 transition-all opacity-80 group-hover:opacity-100 hover:scale-105"
              aria-label="Previous product"
            >
              <ChevronLeft className="w-5 h-5 text-sky-700" />
            </button>

            {/* Right Arrow Button */}
            <button
              type="button"
              onClick={handleNext}
              className="absolute -right-3 sm:-right-5 top-1/2 -translate-y-1/2 z-20 bg-white/90 hover:bg-white text-gray-800 p-2 sm:p-2.5 rounded-full shadow-lg border border-gray-200 transition-all opacity-80 group-hover:opacity-100 hover:scale-105"
              aria-label="Next product"
            >
              <ChevronRight className="w-5 h-5 text-sky-700" />
            </button>

            {/* Responsive Grid / Slider View (Matched to Section 1 sizing) */}
            <div className="overflow-hidden py-2">
              <div
                className="flex transition-transform duration-500 ease-out gap-4"
                style={{
                  transform: `translateX(-${
                    currentIndex * (100 / (window.innerWidth >= 1024 ? 5 : window.innerWidth >= 640 ? 3 : 2))
                  }%)`,
                }}
              >
                {products.map((product) => {
                  const productPath = `${basePath}/products/${product.slug}`;
                  return (
                    <div key={product.id} className="w-1/2 sm:w-1/3 lg:w-1/5 shrink-0 px-1">
                      <div className="bg-white border border-gray-200 hover:border-sky-500 rounded-2xl p-4 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between h-auto min-h-[290px] group/card">
                        <div>
                          {/* Product Image Box */}
                          <Link to={productPath}>
                            <div className="w-full h-24 sm:h-28 rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center p-2 mb-3">
                              {product.image ? (
                                <img
                                  src={product.image}
                                  alt={product.name}
                                  loading="lazy"
                                  className="w-full h-full object-cover rounded-lg group-hover/card:scale-110 transition-transform duration-500"
                                />
                              ) : (
                                <span className="text-[10px] font-bold text-gray-400">No image</span>
                              )}
                            </div>
                          </Link>

                          {/* Product Name */}
                          <Link to={productPath}>
                            <h3 className="font-bold text-gray-800 text-xs sm:text-sm hover:text-sky-600 transition-colors line-clamp-1 mb-1">
                              {product.name}
                            </h3>
                          </Link>

                          {/* Price */}
                          <p className="text-xs sm:text-sm font-black text-gray-900 mb-1">
                            {formatPesoSpaced(product.price)}
                          </p>

                          {/* Stock Status */}
                          <div
                            className={`flex items-center space-x-1 text-[11px] font-semibold mb-3 ${
                              product.inStock ? "text-emerald-600" : "text-rose-600"
                            }`}
                          >
                            {product.inStock ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5" />
                            )}
                            <span>{product.inStock ? "In Stock" : "Out of Stock"}</span>
                          </div>
                        </div>

                        {/* Add to Cart Button */}
                        <div className="pt-1">
                          <Button
                            variant="primary"
                            size="sm"
                            className="w-full justify-center text-xs py-1.5"
                            disabled={!product.inStock}
                            loading={addingId === product.id}
                            onClick={() => void handleAddToCart(product)}
                          >
                            {addingId !== product.id && <ShoppingCart className="w-3.5 h-3.5" />}
                            <span>Add to Cart</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Pagination Dots */}
          <div className="flex items-center justify-center space-x-2 mt-6">
            {products.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setCurrentIndex(index)}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  currentIndex === index ? "w-8 bg-[#3087C5]" : "w-2.5 bg-gray-300 hover:bg-gray-400"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
