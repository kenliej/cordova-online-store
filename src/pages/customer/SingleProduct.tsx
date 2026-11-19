import { useState } from "react";
import { Link, useParams } from "react-router";
import { 
  ArrowLeft, 
  ShoppingCart, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Plus, 
  Minus, 
  Zap 
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Mock Product Data structure with multiple preview images & detailed description highlights
const PRODUCTS_DATA = [
  {
    id: 1,
    name: "Wireless Earbuds",
    category: "Electronics - Audio",
    price: "₱ 1,299",
    originalPrice: "₱ 1,999",
    discount: "-35%",
    isNew: true,
    inStock: true,
    stockCount: 25,
    path: "/products/wireless-earbuds",
    images: [
      "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1593121985387-a2f602324683?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80",
    ],
    shortDescription: "Experience high-quality sound with these wireless earbuds. Designed for comfort, long battery life, and seamless connectivity. Perfect for music, calls, and everyday use.",
    detailedHighlights: [
      {
        title: "Premium Sound Quality",
        text: "Enjoy rich, clear audio with deep bass and crisp highs. Perfect for music, podcasts, and calls."
      },
      {
        title: "Long Battery Life",
        text: "Get up to 24 hours of total playtime with the charging case. Spend less time charging and more time listening."
      },
      {
        title: "Comfortable Fit",
        text: "Lightweight and ergonomic design for all-day comfort. Comes with multiple ear tip sizes for the perfect fit."
      },
      {
        title: "Seamless Connectivity",
        text: "Bluetooth 5.3 ensures a faster, more stable connection with your devices."
      }
    ]
  }
];

export default function SingleProduct() {
 const { id: _id } = useParams();
  
  // Fallback to first mock product if ID doesn't match directly
  const product = PRODUCTS_DATA[0];

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleIncrement = () => {
    if (quantity < product.stockCount) {
      setQuantity((prev) => prev + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity((prev) => prev - 1);
    }
  };

  const handleAddToCart = () => {
    setToastMessage(`Successfully added ${quantity} x "${product.name}" to cart!`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleBuyNow = () => {
    setToastMessage(`Proceeding to checkout for ${quantity} x "${product.name}"!`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const nextImage = () => {
    setActiveImageIndex((prev) => (prev + 1) % product.images.length);
  };

  const prevImage = () => {
    setActiveImageIndex((prev) => (prev - 1 + product.images.length) % product.images.length);
  };

  return (
    <div className="bg-[#EBE9E1] min-h-screen py-8 px-4 sm:px-6 lg:px-12 font-sans">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 border border-white/10 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-sm font-semibold">{toastMessage}</p>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Go Back Navigation */}
        <div>
          <Link 
            to="/products" 
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
              <img 
                src={product.images[activeImageIndex]} 
                alt={product.name} 
                className="w-full h-full object-cover transition-all duration-500"
              />

              {/* In Stock Badge */}
              <div className="absolute top-3 left-3 bg-[#3087C5] text-white text-[11px] font-black px-3 py-1 rounded-full shadow">
                In Stock
              </div>

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
            </div>

            {/* Thumbnail Row */}
            <div className="grid grid-cols-5 gap-2">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-full h-16 rounded-xl overflow-hidden border-2 transition-all ${
                    activeImageIndex === idx ? "border-[#3087C5] scale-105 shadow-md" : "border-gray-200 opacity-70 hover:opacity-100"
                  }`}
                >
                  <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>

          </div>

          {/* RIGHT: Product Details & Purchase Actions (7 cols) */}
          <div className="lg:col-span-7 bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            
            {/* Title & Category */}
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-[#3087C5] tracking-tight mb-1">
                {product.name}
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider">
                {product.category}
              </p>
            </div>

            {/* Price Box */}
            <div className="flex items-baseline space-x-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <span className="text-3xl sm:text-4xl font-black text-gray-900">
                {product.price}
              </span>
              <span className="text-base sm:text-lg font-bold text-gray-400 line-through">
                {product.originalPrice}
              </span>
              <span className="bg-rose-100 text-rose-700 text-xs font-black px-2.5 py-1 rounded-full">
                {product.discount}
              </span>
            </div>

            {/* Short Description */}
            <p className="text-sm sm:text-base text-gray-700 leading-relaxed font-medium">
              {product.shortDescription}
            </p>

            {/* Quantity Selector & Action Buttons */}
            <div className="pt-4 border-t border-gray-100 space-y-4">
              
              <div className="flex items-center space-x-4">
                <span className="text-sm font-bold text-gray-700">Quantity:</span>
                <div className="flex items-center space-x-3 bg-gray-50 border border-gray-200 rounded-full px-3 py-1">
                  <button
                    onClick={handleDecrement}
                    disabled={quantity <= 1}
                    className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-100 disabled:opacity-40"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-sm font-black text-gray-900 w-6 text-center">{quantity}</span>
                  <button
                    onClick={handleIncrement}
                    disabled={quantity >= product.stockCount}
                    className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-100 disabled:opacity-40"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span className="text-xs font-medium text-gray-500">
                  ({product.stockCount} available)
                </span>
              </div>

              {/* Action Buttons using components/ui/button.tsx */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  variant="gold"
                  size="lg"
                  className="flex-1 justify-center shadow-md py-3 text-sm sm:text-base"
                  onClick={handleAddToCart}
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span>Add to Cart</span>
                </Button>

                <Button
                  variant="primary"
                  size="lg"
                  className="flex-1 justify-center shadow-md py-3 text-sm sm:text-base"
                  onClick={handleBuyNow}
                >
                  <Zap className="w-5 h-5" />
                  <span>Buy</span>
                </Button>
              </div>

            </div>

          </div>

        </div>

        {/* BOTTOM: Detailed Description Section */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-bold tracking-wider text-[#3087C5] uppercase mb-1">
              Description
            </h3>
            <div className="w-full border-t border-gray-200 my-2" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {product.detailedHighlights.map((highlight, index) => (
              <div key={index} className="space-y-1">
                <h4 className="font-extrabold text-gray-900 text-base">
                  {highlight.title}
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed font-medium">
                  {highlight.text}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}