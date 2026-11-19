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
  Filter,
  Search,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkerProductCard } from "@/components/ui/WorkerProductCard";
import { EditProductModal, type WorkerProduct } from "@/components/ui/EditProductModal";

// Mock Worker Products Data
const INITIAL_WORKER_PRODUCTS: WorkerProduct[] = [
  { id: 1, name: "Wireless Earbuds", category: "Electronics", description: "High quality wireless earbuds with active noise cancellation.", price: 1299, stocks: 25, isNew: true, images: ["https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&auto=format&fit=crop&q=80"] },
  { id: 2, name: "Sports Shoes", category: "Fashion & Apparel", description: "Durable and comfortable sports shoes for running and training.", price: 1899, stocks: 0, isNew: true, images: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=80"] },
  { id: 3, name: "Laptop Backpack", category: "Home & Living", description: "Water-resistant laptop backpack with USB charging port.", price: 999, stocks: 0, isNew: false, images: ["https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&auto=format&fit=crop&q=80"] },
  { id: 4, name: "Skincare Set", category: "Beauty & Personal Care", description: "Organic daily skincare set for glowing and healthy skin.", price: 1499, stocks: 12, isNew: false, images: ["https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500&auto=format&fit=crop&q=80"] },
  { id: 5, name: "Instant Noodles", category: "Foods & Beverage", description: "Delicious spicy instant noodles pack of 5.", price: 49, stocks: 150, isNew: false, images: ["https://images.unsplash.com/photo-1612929606404-7471ffae7a29?w=500&auto=format&fit=crop&q=80"] },
  { id: 6, name: "Smart Watch", category: "Electronics", description: "Fitness tracker smartwatch with heart rate monitor.", price: 2499, stocks: 0, isNew: false, images: ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=80"] },
  { id: 7, name: "Graphic T-Shirt", category: "Fashion & Apparel", description: "100% cotton casual graphic t-shirt.", price: 499, stocks: 40, isNew: false, images: ["https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=80"] },
  { id: 8, name: "Microwave Oven", category: "Home & Living", description: "Compact digital microwave oven with grill function.", price: 3499, stocks: 8, isNew: false, images: ["https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=500&auto=format&fit=crop&q=80"] },
];

const CATEGORIES = [
  { name: "All Products", icon: ShoppingBag },
  { name: "Foods & Beverage", icon: Utensils },
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

export default function WorkerProducts() {
  const [products, setProducts] = useState<WorkerProduct[]>(INITIAL_WORKER_PRODUCTS);
  const [selectedCategory, setSelectedCategory] = useState("All Products");
  const [searchQuery, setSearchQuery] = useState("");
  const [priceSort, setPriceSort] = useState<"high-to-low" | "low-to-high" | null>(null);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [outOfStockOnly, setOutOfStockOnly] = useState(false);

  const [isCategoryOpen, setIsCategoryOpen] = useState(true);
  const [isPriceOpen, setIsPriceOpen] = useState(true);
  const [isAvailabilityOpen, setIsAvailabilityOpen] = useState(true);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleAddProduct = (newProductData: Omit<WorkerProduct, "id">) => {
    const newProduct: WorkerProduct = {
      ...newProductData,
      id: Date.now(),
      isNew: true,
    };
    setProducts([newProduct, ...products]);
    setToastMessage(`Successfully added "${newProduct.name}" to inventory!`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleUpdateProduct = (updated: WorkerProduct) => {
    setProducts(products.map((p) => (p.id === updated.id ? updated : p)));
    setToastMessage(`Successfully updated "${updated.name}"!`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filter and Search logic
  const filteredProducts = products.filter((prod) => {
    if (selectedCategory !== "All Products" && prod.category !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      if (!prod.name.toLowerCase().includes(query) && !prod.category.toLowerCase().includes(query)) {
        return false;
      }
    }
    const isOutOfStock = prod.stocks === 0;
    if (inStockOnly && isOutOfStock) return false;
    if (outOfStockOnly && !isOutOfStock) return false;

    return true;
  }).sort((a, b) => {
    if (priceSort === "high-to-low") return b.price - a.price;
    if (priceSort === "low-to-high") return a.price - b.price;
    return 0;
  });

  return (
    <section className="bg-[#EBE9E1] w-full py-10 px-4 sm:px-6 relative font-sans">
      
      {/* Toast Notification Popup */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 border border-white/10 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-sm font-semibold">{toastMessage}</p>
        </div>
      )}

      {/* Add Product Modal */}
      <EditProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        product={{ id: "", name: "", category: "Foods & Beverage", description: "", price: 0, stocks: 0, images: [] }}
        mode="update"
        onSave={(newProd) => handleAddProduct(newProd)}
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

        {/* SIDEBAR FILTERS (#E3DFD3 unified background container matching reference image[cite: 10]) */}
        <aside className={`w-full lg:w-85 shrink-0 bg-[#E3DFD3] border border-gray-300/80 rounded-2xl p-5 shadow-sm space-y-6 ${
          isMobileFilterOpen ? "block" : "hidden lg:block"
        }`}>
          
          {/* 1. Category Section (No editing icons & No add category button per instructions) */}
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
              <div className="mt-2 space-y-0 border-t border-gray-300/65">
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
              <div className="mt-2 space-y-3 border-t border-gray-300/65 pt-3">
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

        {/* PRODUCTS AREA */}
        <div className="flex-1 w-full space-y-6">
          
          {/* Top Bar matching reference layout[cite: 10] */}
          <div className="bg-white/60 backdrop-blur-xs p-4 rounded-2xl border border-gray-300/60 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            
            <h2 className="text-xl font-black text-[#3087C5]">
              Products <span className="text-xs font-bold text-gray-500 ml-1">({filteredProducts.length})</span>
            </h2>

            {/* Search Bar */}
            <div className="relative w-full sm:w-72 flex items-center">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-full py-2 pl-4 pr-10 text-sm font-medium focus:outline-none focus:border-[#3087C5]"
              />
              <Search className="absolute right-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            {/* New Product Button using custom Button */}
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsAddModalOpen(true)}
              className="rounded-full shadow-md font-bold uppercase text-xs tracking-wider w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              <span>New Product</span>
            </Button>

          </div>

          {/* Reset Filters Prompt if active */}
          {(selectedCategory !== "All Products" || searchQuery || priceSort || inStockOnly || outOfStockOnly) && (
            <div className="flex items-center justify-between bg-white/40 px-4 py-2 rounded-xl text-xs font-bold text-gray-600">
              <span>Showing filtered results</span>
              <button
                onClick={() => {
                  setSelectedCategory("All Products");
                  setSearchQuery("");
                  setPriceSort(null);
                  setInStockOnly(false);
                  setOutOfStockOnly(false);
                }}
                className="text-[#3087C5] hover:underline flex items-center space-x-1"
              >
                <span>Clear Filters</span>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Products Grid */}
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProducts.map((product) => (
                <WorkerProductCard
                  key={product.id}
                  product={product}
                  onUpdateProduct={handleUpdateProduct}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-12 text-center border border-gray-200 shadow-sm">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="font-bold text-gray-800 text-lg mb-1">No products found</h3>
              <p className="text-sm text-gray-500 mb-4">Try adjusting your filter or search query.</p>
              <button
                onClick={() => {
                  setSelectedCategory("All Products");
                  setSearchQuery("");
                  setPriceSort(null);
                  setInStockOnly(false);
                  setOutOfStockOnly(false);
                }}
                className="bg-[#3087C5] text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-[#256fa4] transition-colors"
              >
                Reset View
              </button>
            </div>
          )}

        </div>

      </div>
    </section>
  );
}