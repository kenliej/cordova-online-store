import { useState } from "react";
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
  Filter
} from "lucide-react";
import { StoreCard } from "@/components/ui/StoreCard";
import type { Store } from "@/components/ui/StoreCard";

// Mock Stores Data matching your reference layout
const ALL_STORES: Store[] = [
  { id: 1, name: "McDonald's", category: "Foods & Beverages", time: "6:00AM - 11:00PM", phone: "0953967329", isOpen: true, image: "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=500&auto=format&fit=crop&q=80", path: "/stores/mcdonalds" },
  { id: 2, name: "Mang Inasal", category: "Foods & Beverages", time: "6:00AM - 11:00PM", phone: "0953967329", isOpen: false, image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&auto=format&fit=crop&q=80", path: "/stores/mang-inasal" },
  { id: 3, name: "Hair Salon", category: "Beauty & Personal Care", time: "6:00AM - 11:00PM", phone: "0953967329", isOpen: true, image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=500&auto=format&fit=crop&q=80", path: "/stores/hair-salon" },
  { id: 4, name: "Cebuana", category: "Others", time: "6:00AM - 11:00PM", phone: "0953967329", isOpen: true, image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=500&auto=format&fit=crop&q=80", path: "/stores/cebuana" },
  { id: 5, name: "Cebuana", category: "Others", time: "6:00AM - 11:00PM", phone: "0953967329", isOpen: true, image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=500&auto=format&fit=crop&q=80", path: "/stores/cebuana-2" },
  { id: 6, name: "Hair Salon", category: "Beauty & Personal Care", time: "6:00AM - 11:00PM", phone: "0953967329", isOpen: true, image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=500&auto=format&fit=crop&q=80", path: "/stores/hair-salon-2" },
  { id: 7, name: "McDonald's", category: "Foods & Beverages", time: "6:00AM - 11:00PM", phone: "0953967329", isOpen: true, image: "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=500&auto=format&fit=crop&q=80", path: "/stores/mcdonalds-2" },
  { id: 8, name: "Mang Inasal", category: "Foods & Beverages", time: "6:00AM - 11:00PM", phone: "0953967329", isOpen: false, image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&auto=format&fit=crop&q=80", path: "/stores/mang-inasal-2" },
  { id: 9, name: "Hair Salon", category: "Beauty & Personal Care", time: "6:00AM - 11:00PM", phone: "0953967329", isOpen: true, image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=500&auto=format&fit=crop&q=80", path: "/stores/hair-salon-3" },
];

const CATEGORIES = [
  { name: "All Stores", icon: ShoppingBag },
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

export function StoresSection1() {
  const [selectedCategory, setSelectedCategory] = useState("All Stores");
  
  // Availability Filter States matching reference ("All Store", "Open Now", "Closed")
  const [allStoreCheck, setAllStoreCheck] = useState(true);
  const [openNowCheck, setOpenNowCheck] = useState(false);
  const [closedCheck, setClosedCheck] = useState(false);

  const [isCategoryOpen, setIsCategoryOpen] = useState(true);
  const [isAvailabilityOpen, setIsAvailabilityOpen] = useState(true);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const handleAllStoreToggle = (checked: boolean) => {
    setAllStoreCheck(checked);
    if (checked) {
      setOpenNowCheck(false);
      setClosedCheck(false);
    }
  };

  const handleSubAvailabilityToggle = (type: "open" | "closed", checked: boolean) => {
    if (type === "open") setOpenNowCheck(checked);
    if (type === "closed") setClosedCheck(checked);
    if (checked) {
      setAllStoreCheck(false);
    } else if (!openNowCheck && !closedCheck) {
      setAllStoreCheck(true);
    }
  };

  const filteredStores = ALL_STORES.filter((store) => {
    if (selectedCategory !== "All Stores") {
      const matchCategory = store.category.toLowerCase().includes(selectedCategory.toLowerCase().split(" ")[0]);
      if (!matchCategory) return false;
    }

    if (!allStoreCheck) {
      if (openNowCheck && !store.isOpen) return false;
      if (closedCheck && store.isOpen) return false;
      if (!openNowCheck && !closedCheck) return false;
    }

    return true;
  });

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
        <aside className={`w-full lg:w-85 shrink-0 bg-[#E3DFD3] border border-gray-300/80 rounded-2xl p-5 shadow-sm space-y-6 ${
          isMobileFilterOpen ? "block" : "hidden lg:block"
        }`}>
          
          {/* 1. Category Filter Section */}
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

          {/* 2. Availability Filter Section */}
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
                    checked={allStoreCheck}
                    onChange={(e) => handleAllStoreToggle(e.target.checked)}
                    className="w-4 h-4 text-[#3087C5] rounded border-gray-300 focus:ring-[#3087C5]"
                  />
                  <span className="text-xs sm:text-sm font-bold text-gray-800">All Store</span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={openNowCheck}
                    onChange={(e) => handleSubAvailabilityToggle("open", e.target.checked)}
                    className="w-4 h-4 text-[#3087C5] rounded border-gray-300 focus:ring-[#3087C5]"
                  />
                  <span className="text-xs sm:text-sm font-bold text-gray-800">Open Now</span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={closedCheck}
                    onChange={(e) => handleSubAvailabilityToggle("closed", e.target.checked)}
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
          
          <div className="flex items-center justify-between mb-6 bg-white/60 backdrop-blur-xs p-4 rounded-2xl border border-gray-300/60 shadow-xs">
            <h2 className="text-lg font-black text-gray-900">
              Showing Stores <span className="text-[#3087C5]">({filteredStores.length})</span>
            </h2>
            {selectedCategory !== "All Stores" && (
              <button
                onClick={() => setSelectedCategory("All Stores")}
                className="text-xs font-bold text-sky-600 hover:underline flex items-center space-x-1"
              >
                <span>Reset Category</span>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {filteredStores.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredStores.map((store) => (
                <StoreCard key={store.id} store={store} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-200 shadow-sm">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="font-bold text-gray-800 text-lg mb-1">No stores found</h3>
              <p className="text-sm text-gray-500 mb-4">Try adjusting your filter or category selection.</p>
              <button
                onClick={() => {
                  setSelectedCategory("All Stores");
                  setAllStoreCheck(true);
                  setOpenNowCheck(false);
                  setClosedCheck(false);
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