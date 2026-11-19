import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { ArrowLeft, ChevronLeft, ChevronRight, Clock, Store as StoreIcon, Phone, MapPin, PackageOpen } from "lucide-react";
import { ProductCard } from "@/components/ui/ProductCard";
import { EmptyState, ErrorBanner, LoadingState } from "@/components/common/Feedback";
import { useToast } from "@/components/common/Toast";
import { useAuth } from "@/context/AuthContext";
import { addCartItem, fetchStore, getErrorMessage } from "@/lib/api";
import { useBasePath } from "@/lib/useBasePath";
import type { Product, StoreDetail } from "@/lib/types";

export default function SingleStore() {
  const { slug } = useParams<{ slug: string }>();
  const basePath = useBasePath();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, refreshCartCount } = useAuth();
  const toast = useToast();

  const [store, setStore] = useState<StoreDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [addingId, setAddingId] = useState<number | null>(null);

  const loadStore = useCallback(async () => {
    if (!slug) {
      setError("This store could not be found.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const data = await fetchStore(slug);
      setStore(data);
      setActiveImageIndex(0);
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Could not load this store. Please try again."));
      setStore(null);
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void loadStore();
  }, [loadStore]);

  const images = store?.images.length ? store.images : store?.image ? [store.image] : [];

  const nextImage = () => {
    if (images.length === 0) return;
    setActiveImageIndex((current) => (current + 1) % images.length);
  };

  const prevImage = () => {
    if (images.length === 0) return;
    setActiveImageIndex((current) => (current - 1 + images.length) % images.length);
  };

  const handleAddToCart = async (product: Product, quantity: number) => {
    if (!user) {
      navigate("/login", { state: { from: `${location.pathname}${location.search}` } });
      return;
    }
    setAddingId(product.id);
    try {
      await addCartItem(product.id, quantity);
      await refreshCartCount();
      toast.success(`Added ${quantity} x "${product.name}" to cart!`);
    } catch (addError) {
      toast.error(getErrorMessage(addError, "Could not add this product to your cart."));
    } finally {
      setAddingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-[#EBE9E1] min-h-screen py-8 px-4 sm:px-6 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <LoadingState label="Loading store…" />
        </div>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="bg-[#EBE9E1] min-h-screen py-8 px-4 sm:px-6 lg:px-12 font-sans">
        <div className="max-w-3xl mx-auto space-y-4">
          <Link
            to={`${basePath}/stores`}
            className="inline-flex items-center space-x-1.5 text-[#3087C5] font-bold text-sm hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back to Stores</span>
          </Link>
          <ErrorBanner message={error || "This store could not be found."} onRetry={() => void loadStore()} />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#EBE9E1] min-h-screen py-8 px-4 sm:px-6 lg:px-12 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Go Back Navigation */}
        <div>
          <Link
            to={`${basePath}/stores`}
            className="inline-flex items-center space-x-1.5 text-[#3087C5] font-bold text-sm hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back to Stores</span>
          </Link>
        </div>

        {/* Main Store Section Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT: Image Gallery (5 cols) */}
          <div className="lg:col-span-5 bg-white border border-gray-200 rounded-3xl p-4 shadow-sm">
            {/* Main Active Image Display Box */}
            <div className="relative w-full h-80 sm:h-96 rounded-2xl overflow-hidden bg-gray-50 flex items-center justify-center mb-4">
              {images[activeImageIndex] ? (
                <img
                  src={images[activeImageIndex]}
                  alt={store.name}
                  className="w-full h-full object-cover transition-all duration-500"
                />
              ) : (
                <span className="text-sm font-bold text-gray-400">No photo available</span>
              )}

              {/* Availability Status Badge */}
              <div
                className={`absolute top-3 left-3 text-white text-[11px] font-black px-3 py-1 rounded-full shadow ${
                  store.isOpen ? "bg-[#D4A328]" : "bg-gray-500"
                }`}
              >
                {store.isOpen ? "Open" : "Close"}
              </div>

              {images.length > 1 && (
                <>
                  {/* Slider Arrows */}
                  <button
                    onClick={prevImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-gray-800 flex items-center justify-center shadow transition-colors"
                    aria-label="Previous Image"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-gray-800 flex items-center justify-center shadow transition-colors"
                    aria-label="Next Image"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail Row */}
            {images.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {images.map((img, index) => (
                  <button
                    key={`${img}-${index}`}
                    onClick={() => setActiveImageIndex(index)}
                    className={`w-full h-16 rounded-xl overflow-hidden border-2 transition-all ${
                      activeImageIndex === index
                        ? "border-[#3087C5] scale-105 shadow-md"
                        : "border-gray-200 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={img} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: Store Details Info (7 cols) */}
          <div className="lg:col-span-7 bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            {/* Title & Category */}
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-[#3087C5] tracking-tight mb-1">{store.name}</h1>
              <p className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider">{store.category}</p>
            </div>

            {/* Time & Operating Schedule Box */}
            <div className="flex items-center space-x-3 bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-800">
              <div className="w-10 h-10 rounded-xl bg-[#3087C5] text-white flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Operating Hours</p>
                <p className="text-base sm:text-lg font-black text-gray-900">{store.operatingHours}</p>
              </div>
            </div>

            {/* Contact details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5 text-xs font-bold text-gray-700">
                <Phone className="w-4 h-4 text-[#3087C5] shrink-0" />
                <span>{store.phone || "No contact number"}</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5 text-xs font-bold text-gray-700">
                <MapPin className="w-4 h-4 text-[#3087C5] shrink-0" />
                <span className="truncate">{store.floorLocation || "Inside Online Mall Cordova"}</span>
              </div>
            </div>

            {/* Main Store Description */}
            {store.description && (
              <p className="text-sm sm:text-base text-gray-700 leading-relaxed font-medium">{store.description}</p>
            )}

            {/* Store Information Summary Pill */}
            <div className="pt-4 border-t border-gray-100 flex items-center space-x-2 text-xs font-bold text-gray-500">
              <StoreIcon className="w-4 h-4 text-[#3087C5]" />
              <span>Located inside Online Mall Cordova • Verified Partner Store</span>
            </div>
          </div>
        </div>

        {/* Store products */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
          <div>
            <h3 className="text-sm font-bold tracking-wider text-[#3087C5] uppercase mb-1">Products from this Store</h3>
            <div className="w-full border-t border-gray-200 my-2" />
          </div>

          {store.products.length === 0 ? (
            <EmptyState
              icon={<PackageOpen className="w-10 h-10" />}
              title="No products listed for this store yet"
              description="Check back soon — the store has not published any products."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {store.products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  basePath={basePath}
                  onAddToCart={(item, quantity) => void handleAddToCart(item, quantity)}
                  adding={addingId === product.id}
                />
              ))}
            </div>
          )}
        </div>

        {/* BOTTOM: Detailed Highlights / Description Section */}
        {store.highlights.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div>
              <h3 className="text-sm font-bold tracking-wider text-[#3087C5] uppercase mb-1">
                Store Features & Services
              </h3>
              <div className="w-full border-t border-gray-200 my-2" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {store.highlights.map((highlight, index) => (
                <div key={`${highlight.title}-${index}`} className="space-y-1">
                  {highlight.title && <h4 className="font-extrabold text-gray-900 text-base">{highlight.title}</h4>}
                  <p className="text-sm text-gray-600 leading-relaxed font-medium">{highlight.body}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
