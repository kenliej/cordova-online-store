import { useState } from "react";
import { 
  Bell, 
  Tag, 
  Package, 
  Megaphone, 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  SlidersHorizontal,
  X 
} from "lucide-react";
import { NotificationCard } from "@/components/ui/NotificationCard";
import type { NotificationItem } from "@/components/ui/NotificationCard";

// Mock Notifications Data matching your reference layout
const ALL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 1,
    title: "Flash sale",
    description: "Up to 50% off select brands, plus 50% off all store brands.",
    category: "Offers & Sales",
    time: "1mins ago",
    icon: <Tag className="w-5 h-5" />,
  },
  {
    id: 2,
    title: "Discount Reminder",
    description: "Final hours! Enjoy up to 70% off top featured brands and 70% off all our exclusive house brands.",
    category: "Offers & Sales",
    time: "1mins ago",
    icon: <Tag className="w-5 h-5" />,
  },
  {
    id: 3,
    title: "Flash sale",
    description: "Our flash sale is live! Take up to 50% off select brands and 50% off all your brands today.",
    category: "Offers & Sales",
    time: "2mins ago",
    icon: <Tag className="w-5 h-5" />,
  },
  {
    id: 4,
    title: "Order",
    description: "order pending",
    category: "Order",
    time: "5mins ago",
    icon: <Package className="w-5 h-5" />,
  },
  {
    id: 5,
    title: "New Update ver 1.1",
    description: "System Update: Our website has been updated to improve your browsing experience. [Learn More]",
    category: "System",
    time: "10/5/26",
    icon: <Megaphone className="w-5 h-5" />,
  },
];

const CATEGORIES = [
  { name: "All", icon: Bell, count: 5 },
  { name: "Offers & Sales", icon: Tag, count: 3 },
  { name: "Order", icon: Package, count: 1 },
  { name: "System", icon: Megaphone, count: 1 },
];

export function NotificationsSection1() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCategoryOpen, setIsCategoryOpen] = useState(true);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Filter and Search logic
  const filteredNotifications = ALL_NOTIFICATIONS.filter((notif) => {
    if (selectedCategory !== "All" && notif.category !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      const matchTitle = notif.title.toLowerCase().includes(query);
      const matchDesc = notif.description.toLowerCase().includes(query);
      if (!matchTitle && !matchDesc) return false;
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
            <span>{isMobileFilterOpen ? "Hide Notifications Center" : "Notifications Center"}</span>
          </button>
        </div>

        {/* SIDEBAR FILTERS (#E3DFD3 unified background container matching reference layout) */}
        <aside className={`w-full lg:w-85 shrink-0 bg-[#E3DFD3] border border-gray-300/80 rounded-2xl p-5 shadow-sm space-y-6 ${
          isMobileFilterOpen ? "block" : "hidden lg:block"
        }`}>
          
          <div>
            {/* Collapsible Header */}
            <div 
              className="flex items-center justify-between cursor-pointer pb-3"
              onClick={() => setIsCategoryOpen(!isCategoryOpen)}
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#3087C5] text-white flex items-center justify-center shadow-xs">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <h3 className="font-black text-gray-900 text-base">Notifications Center</h3>
              </div>
              <button className="text-gray-600 hover:text-gray-900">
                {isCategoryOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>

            {/* Category List with rounded-none and space-y-0 */}
            {isCategoryOpen && (
              <div className="mt-2 space-y-0 border-t border-gray-300/60 max-h-[380px] overflow-y-auto">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = selectedCategory === cat.name;
                  return (
                    <button
                      key={cat.name}
                      onClick={() => {
                        setSelectedCategory(cat.name);
                        setIsMobileFilterOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 text-xs sm:text-sm font-bold transition-all rounded-none ${
                        isSelected 
                          ? "bg-white text-gray-900 border-l-4 border-[#3087C5] shadow-xs" 
                          : "bg-white/40 text-gray-700 hover:bg-white/70 border-l-4 border-transparent"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="w-4 h-4 text-[#3087C5]" />
                        <span className="truncate text-left">{cat.name}</span>
                      </div>
                      <span className="text-xs font-semibold text-gray-500 bg-gray-200/60 px-2 py-0.5 rounded-full shrink-0">
                        ({cat.count})
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

        </aside>

        {/* NOTIFICATIONS FEED RESULTS */}
        <div className="flex-1 w-full space-y-5">
          
          {/* Header & Search Bar */}
          <div className="bg-white/60 backdrop-blur-xs p-4 rounded-2xl border border-gray-300/60 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <h2 className="text-lg font-black text-gray-900">
              Recent Notifications
            </h2>

            {/* Search Bar matching reference image */}
            <div className="relative w-full sm:w-80 flex items-center">
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-full py-2 pl-4 pr-12 text-sm font-medium focus:outline-none focus:border-[#3087C5]"
              />
              <button
                type="button"
                className="absolute right-1 bg-[#3087C5] text-white p-2 rounded-full hover:bg-[#256fa4] transition-colors"
                aria-label="Search button"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Reset Filter prompt if searching or filtering */}
          {(selectedCategory !== "All" || searchQuery) && (
            <div className="flex items-center justify-between bg-white/40 px-4 py-2 rounded-xl text-xs font-bold text-gray-600">
              <span>Showing filtered notifications ({filteredNotifications.length})</span>
              <button
                onClick={() => {
                  setSelectedCategory("All");
                  setSearchQuery("");
                }}
                className="text-[#3087C5] hover:underline flex items-center space-x-1"
              >
                <span>Clear Filters</span>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Notifications List */}
          {filteredNotifications.length > 0 ? (
            <div className="space-y-3">
              {filteredNotifications.map((notif) => (
                <NotificationCard key={notif.id} notification={notif} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-200 shadow-sm">
              <Bell className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="font-bold text-gray-800 text-lg mb-1">No notifications found</h3>
              <p className="text-sm text-gray-500 mb-4">Try checking another category or clearing your search.</p>
              <button
                onClick={() => {
                  setSelectedCategory("All");
                  setSearchQuery("");
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