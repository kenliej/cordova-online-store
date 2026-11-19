import { useState } from "react";
import { 
  ChevronDown, 
  ChevronUp, 

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
  Search,
  Plus,
  Clock,
  Phone,
  Settings,
  Eye,
  Trash2,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminStoreModal, type StoreItem } from "@/components/ui/AdminStoreModal";

const INITIAL_STORES: StoreItem[] = [
  { id: 1, name: "Mang INASAL", category: "Foods & Beverages", time: "6:00AM - 11:00PM", phone: "0953967329", isOpen: true, image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&auto=format&fit=crop&q=80" },
  { id: 2, name: "MacDonald's", category: "Foods & Beverages", time: "6:00AM - 11:00PM", phone: "0953967329", isOpen: true, image: "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=500&auto=format&fit=crop&q=80" },
  { id: 3, name: "Shein", category: "Fashion & Apparel", time: "6:00AM - 11:00PM", phone: "0953967329", isOpen: true, image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=500&auto=format&fit=crop&q=80" },
  { id: 4, name: "Jollibee", category: "Foods & Beverages", time: "6:00AM - 11:00PM", phone: "0953967329", isOpen: true, image: "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=500&auto=format&fit=crop&q=80" },
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

export default function StoreDashboard() {
  const [stores, setStores] = useState<StoreItem[]>(INITIAL_STORES);
  const [selectedCategory, setSelectedCategory] = useState("All Stores");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [allStoreCheck, setAllStoreCheck] = useState(true);
  const [openNowCheck, setOpenNowCheck] = useState(false);
  const [closedCheck, setClosedCheck] = useState(false);

  const [isCategoryOpen, setIsCategoryOpen] = useState(true);
  const [isAvailabilityOpen, setIsAvailabilityOpen] = useState(true);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "update" | "view">("create");
  const [selectedStore, setSelectedStore] = useState<StoreItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  const handleSaveStore = (storeData: StoreItem) => {
    if (modalMode === "create") {
      setStores([storeData, ...stores]);
      setToastMessage(`Successfully added "${storeData.name}"!`);
    } else {
      setStores(stores.map((s) => (s.id === storeData.id ? storeData : s)));
      setToastMessage(`Successfully updated "${storeData.name}"!`);
    }
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleDeleteStore = (id: number | string, name: string) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      setStores(stores.filter((s) => s.id !== id));
      setToastMessage(`Deleted "${name}" from stores.`);
      setTimeout(() => setToastMessage(null), 3500);
    }
  };

  const filteredStores = stores.filter((store) => {
    if (selectedCategory !== "All Stores" && store.category !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      if (!store.name.toLowerCase().includes(query) && !store.category.toLowerCase().includes(query)) {
        return false;
      }
    }
    if (!allStoreCheck) {
      if (openNowCheck && !store.isOpen) return false;
      if (closedCheck && store.isOpen) return false;
      if (!openNowCheck && !closedCheck) return false;
    }
    return true;
  });

  return (
    <section className="bg-[#EBE9E1] w-full py-10 px-4 sm:px-6 relative font-sans min-h-screen">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 border border-white/10 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-sm font-semibold">{toastMessage}</p>
        </div>
      )}

      {/* Admin Store Modal */}
      <AdminStoreModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        store={selectedStore}
        mode={modalMode}
        onSave={handleSaveStore}
      />

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 items-start">
        
        {/* MOBILE FILTER BUTTON */}
        <div className="w-full lg:hidden">
          <button
            onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
            className="w-full bg-[#3087C5] text-white py-3 px-5 rounded-2xl font-bold flex items-center justify-center space-x-2 shadow-md hover:bg-[#256fa4]"
          >
            <Filter className="w-5 h-5" />
            <span>{isMobileFilterOpen ? "Hide Filter Menu" : "Filter Menu"}</span>
          </button>
        </div>

        {/* SIDEBAR FILTERS */}
        <aside className={`w-full lg:w-85 shrink-0 bg-[#E3DFD3] border border-gray-300/80 rounded-2xl p-5 shadow-sm space-y-6 ${
          isMobileFilterOpen ? "block" : "hidden lg:block"
        }`}>
          
          {/* Categories */}
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

          {/* Availability */}
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

        {/* STORES CONTENT */}
        <div className="flex-1 w-full space-y-6">
          
          {/* Top Bar matching reference image (Stores title, Search bar, New Store button) */}
          <div className="bg-white/60 backdrop-blur-xs p-4 rounded-2xl border border-gray-300/60 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            
            <h2 className="text-xl font-black text-[#3087C5]">
              Stores <span className="text-xs font-bold text-gray-500 ml-1">({filteredStores.length})</span>
            </h2>

            <div className="relative w-full sm:w-72 flex items-center">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-full py-2 pl-4 pr-10 text-sm font-medium focus:outline-none focus:border-[#3087C5]"
              />
              <Search className="absolute right-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={() => { setSelectedStore(null); setModalMode("create"); setIsModalOpen(true); }}
              className="rounded-full shadow-md font-bold uppercase text-xs tracking-wider w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              <span>New Store</span>
            </Button>

          </div>

          {/* Stores List matching reference layout */}
          {filteredStores.length > 0 ? (
            <div className="space-y-4">
              {filteredStores.map((store) => (
                <div key={store.id} className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-5">
                  
                  <div className="flex items-center space-x-5 w-full sm:w-auto">
                    <div className="w-28 h-28 rounded-2xl bg-gray-50 overflow-hidden border border-gray-200 shrink-0">
                      <img src={store.image} alt={store.name} className="w-full h-full object-cover" />
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-black text-gray-900 text-lg">
                        {store.name}
                      </h3>
                      <p className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#3087C5]" />
                        <span>Open: {store.time}</span>
                      </p>
                      <p className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-[#3087C5]" />
                        <span>{store.phone}</span>
                      </p>
                    </div>
                  </div>

                  {/* Actions matching reference buttons (Update Store, View Store, Delete Store) */}
                  <div className="flex flex-wrap items-center justify-end gap-2.5 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                    
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => { setSelectedStore(store); setModalMode("update"); setIsModalOpen(true); }}
                      className="rounded-full font-bold shadow-xs px-4"
                    >
                      <Settings className="w-3.5 h-3.5 mr-1.5" />
                      <span>Update Store</span>
                    </Button>

                    <Button
                      variant="white"
                      size="sm"
                      onClick={() => { setSelectedStore(store); setModalMode("view"); setIsModalOpen(true); }}
                      className="rounded-full font-bold border-gray-300 text-gray-800 hover:bg-gray-50 shadow-xs px-4"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1.5 text-gray-600" />
                      <span>View Store</span>
                    </Button>

                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDeleteStore(store.id, store.name)}
                      className="rounded-full font-bold shadow-xs px-4"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      <span>Delete Store</span>
                    </Button>

                  </div>

                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-12 text-center border border-gray-200 shadow-sm">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="font-bold text-gray-800 text-lg mb-1">No stores found</h3>
              <p className="text-sm text-gray-500 mb-4">Try adjusting your filters or search query.</p>
              <button
                onClick={() => {
                  setSelectedCategory("All Stores");
                  setSearchQuery("");
                  setAllStoreCheck(true);
                  setOpenNowCheck(false);
                  setClosedCheck(false);
                }}
                className="bg-[#3087C5] text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-[#256fa4]"
              >
                Reset Filters
              </button>
            </div>
          )}

        </div>

      </div>
    </section>
  );
}