import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { ArrowLeft, ShoppingCart, ChevronLeft, ChevronRight, Plus, Minus, Zap, PackageX, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorBanner, LoadingState } from "@/components/common/Feedback";
import { useToast } from "@/components/common/Toast";
import { useAuth } from "@/context/AuthContext";
import { addCartItem, fetchProduct, getErrorMessage } from "@/lib/api";
import { formatPesoSpaced } from "@/lib/format";
import { useBasePath } from "@/lib/useBasePath";
import type { ProductDetail } from "@/lib/types";

export default function SingleProduct() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = useBasePath();
  const { user, refreshCartCount } = useAuth();
  const toast = useToast();

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [isBuying, setIsBuying] = useState(false);

  const loadProduct = useCallback(async () => {
    if (!slug) {
      setError("This product could not be found.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const data = await fetchProduct(slug);
      setProduct(data);
      setActiveImageIndex(0);
      setQuantity(1);
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Could not load this product. Please try again."));
      setProduct(null);
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void loadProduct();
  }, [loadProduct]);

  const images = product?.images.length ? product.images : product?.image ? [product.image] : [];
  const maxQuantity = Math.max(1, product?.stock ?? 1);

  const handleIncrement = () => {
    setQuantity((current) => Math.min(maxQuantity, current + 1));
  };

  const handleDecrement = () => {
    setQuantity((current) => Math.max(1, current - 1));
  };

  const nextImage = () => {
    if (images.length === 0) return;
    setActiveImageIndex((current) => (current + 1) % images.length);
  };

  const prevImage = () => {
    if (images.length === 0) return;
    setActiveImageIndex((current) => (current - 1 + images.length) % images.length);
  };

  const requireLogin = () => {
    navigate("/login", { state: { from: `${location.pathname}${location.search}` } });
  };

  const handleAddToCart = async (options: { thenGoToCart?: boolean } = {}) => {
    if (!product) return;
    if (!user) {
      requireLogin();
      return;
    }
    if (!product.inStock) return;

    const setBusy = options.thenGoToCart ? setIsBuying : setIsAdding;
    setBusy(true);
    try {
      await addCartItem(product.id, quantity);
      await refreshCartCount();
      if (options.thenGoToCart) {
        navigate("/cart");
      } else {
        toast.success(`Successfully added ${quantity} x "${product.name}" to cart!`);
      }
    } catch (addError) {
      toast.error(getErrorMessage(addError, "Could not add this product to your cart."));
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-[#EBE9E1] min-h-screen py-8 px-4 sm:px-6 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <LoadingState label="Loading product…" />
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="bg-[#EBE9E1] min-h-screen py-8 px-4 sm:px-6 lg:px-12 font-sans">
        <div className="max-w-3xl mx-auto space-y-4">
          <Link
            to={`${basePath}/products`}
            className="inline-flex items-center space-x-1.5 text-[#3087C5] font-bold text-sm hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </Link>
          <ErrorBanner message={error || "This product could not be found."} onRetry={() => void loadProduct()} />
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
            to={`${basePath}/products`}
            className="inline-flex items-center space-x-1.5 text-[#3087C5] font-bold text-sm hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </Link>
        </div>

        {/* Main Product Section Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT: Image Gallery (5 cols) */}
          <div className="lg:col-span-5 bg-white border border-gray-200 rounded-3xl p-4 shadow-sm">
            {/* Main Active Image Display Box */}
            <div className="relative w-full h-80 sm:h-96 rounded-2xl overflow-hidden bg-gray-50 flex items-center justify-center mb-4">
              {images[activeImageIndex] ? (
                <img
                  src={images[activeImageIndex]}
                  alt={product.name}
                  className="w-full h-full object-cover transition-all duration-500"
                />
              ) : (
                <span className="text-sm font-bold text-gray-400">No image available</span>
              )}

              {/* In Stock Badge */}
              <div
                className={`absolute top-3 left-3 text-white text-[11px] font-black px-3 py-1 rounded-full shadow inline-flex items-center gap-1 ${
                  product.inStock ? "bg-[#3087C5]" : "bg-rose-600"
                }`}
              >
                {product.inStock ? <PackageX className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                <span>{product.inStock ? "In Stock" : "Out of Stock"}</span>
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

          {/* RIGHT: Product Details & Purchase Actions (7 cols) */}
          <div className="lg:col-span-7 bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            {/* Title & Category */}
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-[#3087C5] tracking-tight mb-1">{product.name}</h1>
              <p className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider">
                {product.category}
                {product.storeName && <span className="normal-case tracking-normal"> · Sold by {product.storeName}</span>}
              </p>
            </div>

            {/* Price Box */}
            <div className="flex flex-wrap items-baseline gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <span className="text-3xl sm:text-4xl font-black text-gray-900">{formatPesoSpaced(product.price)}</span>
              {product.originalPrice && (
                <span className="text-base sm:text-lg font-bold text-gray-400 line-through">
                  {formatPesoSpaced(product.originalPrice)}
                </span>
              )}
              {product.discountPercent && (
                <span className="bg-rose-100 text-rose-700 text-xs font-black px-2.5 py-1 rounded-full">
                  -{product.discountPercent}%
                </span>
              )}
              {product.isNew && (
                <span className="bg-amber-100 text-amber-800 text-xs font-black px-2.5 py-1 rounded-full">New</span>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <p className="text-sm sm:text-base text-gray-700 leading-relaxed font-medium">{product.description}</p>
            )}

            {/* Quantity Selector & Action Buttons */}
            <div className="pt-4 border-t border-gray-100 space-y-4">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-bold text-gray-700">Quantity:</span>
                <div className="flex items-center space-x-3 bg-gray-50 border border-gray-200 rounded-full px-3 py-1">
                  <button
                    onClick={handleDecrement}
                    disabled={quantity <= 1 || !product.inStock}
                    className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-100 disabled:opacity-40"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-sm font-black text-gray-900 w-6 text-center">{quantity}</span>
                  <button
                    onClick={handleIncrement}
                    disabled={quantity >= maxQuantity || !product.inStock}
                    className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-100 disabled:opacity-40"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span className="text-xs font-medium text-gray-500">
                  {product.inStock ? `(${product.stock} available)` : "(Currently out of stock)"}
                </span>
              </div>

              {/* Action Buttons using components/ui/button.tsx */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  variant="gold"
                  size="lg"
                  className="flex-1 justify-center shadow-md py-3 text-sm sm:text-base"
                  disabled={!product.inStock}
                  loading={isAdding}
                  onClick={() => void handleAddToCart()}
                >
                  {!isAdding && <ShoppingCart className="w-5 h-5" />}
                  <span>Add to Cart</span>
                </Button>

                <Button
                  variant="primary"
                  size="lg"
                  className="flex-1 justify-center shadow-md py-3 text-sm sm:text-base"
                  disabled={!product.inStock}
                  loading={isBuying}
                  onClick={() => void handleAddToCart({ thenGoToCart: true })}
                >
                  {!isBuying && <Zap className="w-5 h-5" />}
                  <span>Buy</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM: Detailed Description Section */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-bold tracking-wider text-[#3087C5] uppercase mb-1">Description</h3>
            <div className="w-full border-t border-gray-200 my-2" />
          </div>

          {product.highlights.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {product.highlights.map((highlight, index) => (
                <div key={`${highlight.title}-${index}`} className="space-y-1">
                  {highlight.title && (
                    <h4 className="font-extrabold text-gray-900 text-base">{highlight.title}</h4>
                  )}
                  <p className="text-sm text-gray-600 leading-relaxed font-medium">{highlight.body}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-600 leading-relaxed font-medium">
              {product.description || "No additional description is available for this product."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
