import { useState } from "react";
import { 
  ChevronDown, 
  ChevronUp, 
  X, 
  Check, 
  SlidersHorizontal, 
  ShoppingBag, 
  CheckCircle2, 
  Utensils, 
  Laptop, 
  Sparkles, 
  Home, 
  HeartPulse, 
  Gamepad2, 
  Shirt, 
  Cpu, 
  Package,
  Filter
} from "lucide-react";
import { ProductCard } from "@/components/ui/ProductCard";
import type { Product } from "@/components/ui/ProductCard";

// Mock Sample Products with stock counts included
const ALL_PRODUCTS: Product[] = [
  { id: 1, name: "Wireless Earbuds", category: "Electronics - Audio", price: "₱ 1,299", isNew: true, inStock: true, stockCount: 25, image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&auto=format&fit=crop&q=80", path: "/products/wireless-earbuds" },
  { id: 2, name: "Sports Shoes", category: "Fashion - Footwear", price: "₱ 1,899", isNew: true, inStock: false, stockCount: 0, image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=80", path: "/products/sports-shoes" },
  { id: 3, name: "Laptop Backpack", category: "Bags - Accessories", price: "₱ 999", isNew: false, inStock: false, stockCount: 0, image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&auto=format&fit=crop&q=80", path: "/products/laptop-backpack" },
  { id: 4, name: "Skincare Set", category: "Beauty & Personal Care", price: "₱ 1,499", isNew: false, inStock: true, stockCount: 12, image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500&auto=format&fit=crop&q=80", path: "/products/skincare-set" },
  { id: 5, name: "Instant Noodles", category: "Foods & Beverages", price: "₱ 49", isNew: false, inStock: true, stockCount: 150, image: "https://images.unsplash.com/photo-1612929606404-7471ffae7a29?w=500&auto=format&fit=crop&q=80", path: "/products/instant-noodles" },
  { id: 6, name: "Smart Watch", category: "Electronics - Wearables", price: "₱ 2,499", isNew: false, inStock: false, stockCount: 0, image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=80", path: "/products/smart-watch" },
  { id: 7, name: "Graphic T-Shirt", category: "Fashion - Men's Wear", price: "₱ 499", isNew: false, inStock: true, stockCount: 40, image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=80", path: "/products/graphic-tshirt" },
  { id: 8, name: "Microwave Oven", category: "Home & Living - Kitchen", price: "₱ 3,499", isNew: false, inStock: true, stockCount: 8, image: "https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=500&auto=format&fit=crop&q=80", path: "/products/microwave-oven" },
  { id: 9, name: "Bluetooth Headphones", category: "Electronics - Audio", price: "₱ 1,799", isNew: false, inStock: true, stockCount: 18, image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=80", path: "/products/bluetooth-headphones" },
  { id: 10, name: "Hair Care Set", category: "Beauty & Personal Care", price: "₱ 1,099", isNew: false, inStock: false, stockCount: 0, image: "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=500&auto=format&fit=crop&q=80", path: "/products/hair-care-set" },
  { id: 11, name: "Yoga Mat", category: "Sports & Outdoors", price: "₱ 599", isNew: false, inStock: true, stockCount: 30, image: "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=500&auto=format&fit=crop&q=80", path: "/products/yoga-mat" },
  { id: 12, name: "Stainless Tumbler", category: "Home & Living", price: "₱ 450", isNew: true, inStock: true, stockCount: 50, image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500&auto=format&fit=crop&q=80", path: "/products/stainless-tumbler" },
];

const CATEGORIES = [
  { name: "All Products", icon: ShoppingBag },
  { name: "Foods & Beverages", icon: Utensils },
  { name: "Electronics", icon: Laptop },
  { name: "Beauty & Personal Care", icon: Sparkles },
  { name: "Home & Living", icon: Home },
  { name: "Health & Wellness", icon: HeartPulse },
  { name: "Toys & Games", icon: Gamepad2 },
  { name: "Sports & Outdoors", icon: Sparkles },
  { name: "Books & Stationery", icon: ShoppingBag },
  { name: "Fashion & Apparel", icon: Shirt },
  { name: "Computer & Accessories", icon: Cpu },
  { name: "Others", icon: Package },
];

export function ProductsSection1() {
  const [selectedCategory, setSelectedCategory] = useState("All Products");
  const [priceSort, setPriceSort] = useState<"high-to-low" | "low-to-high" | null>(null);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [outOfStockOnly, setOutOfStockOnly] = useState(false);

  const [isCategoryOpen, setIsCategoryOpen] = useState(true);
  const [isPriceOpen, setIsPriceOpen] = useState(true);
  const [isAvailabilityOpen, setIsAvailabilityOpen] = useState(true);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleAddToCart = (productName: string, quantity: number) => {
    setToastMessage(`Added ${quantity} x "${productName}" to cart!`);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const filteredProducts = ALL_PRODUCTS.filter((prod) => {
    if (selectedCategory !== "All Products") {
      const matchCategory = prod.category.toLowerCase().includes(selectedCategory.toLowerCase().split(" ")[0]);
      if (!matchCategory) return false;
    }
    if (inStockOnly && !prod.inStock) return false;
    if (outOfStockOnly && prod.inStock) return false;

    return true;
  }).sort((a, b) => {
    const priceA = parseFloat(a.price.replace("₱", "").replace(",", "").trim());
    const priceB = parseFloat(b.price.replace("₱", "").replace(",", "").trim());
    if (priceSort === "high-to-low") return priceB - priceA;
    if (priceSort === "low-to-high") return priceA - priceB;
    return 0;
  });

  return (
    <section className="bg-[#EBE9E1] w-full py-10 px-4 sm:px-6 relative">
      
      {/* Toast Notification Popup */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 border border-white/10 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-sm font-semibold">{toastMessage}</p>
        </div>
      )}

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
        <aside className={`w-full lg:w-85 shrink-0 bg-[#E3DFD3] border border-gray-300/80 rounded-2xl p-5 shadow-sm space-y-6 ${
          isMobileFilterOpen ? "block" : "hidden lg:block"
        }`}>
          
          {/* 1. Category Section */}
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
              <button className="text-gray-600 hover:text-gray-900">
                {isCategoryOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>

            {isCategoryOpen && (
              <div className="mt-2 space-y-0 border-t border-gray-300/60 max-h-[380px] overflow-y-auto">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = selectedCategory === cat.name;
                  return (
                    <button
                      key={cat.name}
                      onClick={() => setSelectedCategory(cat.name)}
                      className={`w-full flex items-center space-x-3 px-3 py-2.5 text-xs sm:text-sm font-bold transition-all rounded-none ${
                        isSelected 
                          ? "bg-white text-gray-900 border-l-4 border-[#3087C5] shadow-xs" 
                          : "bg-white/40 text-gray-700 hover:bg-white/70 border-l-4 border-transparent"
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0 text-[#3087C5]" />
                      <span className="truncate text-left">{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Price Range Section */}
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
              <button className="text-gray-600 hover:text-gray-900">
                {isPriceOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>

            {isPriceOpen && (
              <div className="mt-2 space-y-0 border-t border-gray-300/60">
                <button
                  onClick={() => setPriceSort(priceSort === "high-to-low" ? null : "high-to-low")}
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
                  onClick={() => setPriceSort(priceSort === "low-to-high" ? null : "low-to-high")}
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
              <button className="text-gray-600 hover:text-gray-900">
                {isAvailabilityOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>

            {isAvailabilityOpen && (
              <div className="mt-2 space-y-3 border-t border-gray-300/60 pt-3">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => setInStockOnly(e.target.checked)}
                    className="w-4 h-4 text-[#3087C5] rounded border-gray-300 focus:ring-[#3087C5]"
                  />
                  <span className="text-xs sm:text-sm font-bold text-gray-800">In Stock</span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={outOfStockOnly}
                    onChange={(e) => setOutOfStockOnly(e.target.checked)}
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
          
          <div className="flex items-center justify-between mb-6 bg-white/60 backdrop-blur-xs p-4 rounded-2xl border border-gray-300/60 shadow-xs">
            <h2 className="text-lg font-black text-gray-900">
              Showing Results <span className="text-[#3087C5]">({filteredProducts.length})</span>
            </h2>
            {selectedCategory !== "All Products" && (
              <button
                onClick={() => setSelectedCategory("All Products")}
                className="text-xs font-bold text-sky-600 hover:underline flex items-center space-x-1"
              >
                <span>Reset Category</span>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProducts.map((product) => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  onAddToCart={handleAddToCart} 
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-200 shadow-sm">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="font-bold text-gray-800 text-lg mb-1">No products found</h3>
              <p className="text-sm text-gray-500 mb-4">Try adjusting your filter or category selection.</p>
              <button
                onClick={() => {
                  setSelectedCategory("All Products");
                  setPriceSort(null);
                  setInStockOnly(false);
                  setOutOfStockOnly(false);
                }}
                className="bg-[#3087C5] text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-[#256fa4] transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          )}

        </div>

      </div>
    </section>
  );
}