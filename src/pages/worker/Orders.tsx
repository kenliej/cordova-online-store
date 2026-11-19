import { useState } from "react";
import { 
  ShoppingCart, 
  Package, 
  CheckCircle2, 
  Ban, 
  AlertTriangle, 
  Search,
  Eye,
  Clock,
  SlidersHorizontal,
  ChevronUp,
  ChevronDown,
  Filter,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";

// --- Types ---
export interface OrderItem {
  id: number;
  title: string;
  price: number;
  quantity: number;
  image: string;
}

export interface OrderRecord {
  id: string;
  customerName: string;
  status: "Pending" | "Ready to Claim" | "Claimed" | "Cancelled" | "Didn't Claimed";
  dateOrdered: string;
  dateReady?: string;
  totalPrice: number;
  items: OrderItem[];
}

// --- Mock Initial Data ---
const INITIAL_ORDERS: OrderRecord[] = [
  {
    id: "1564132164872",
    customerName: "Dudes Aro Inihao",
    status: "Pending",
    dateOrdered: "10/23/2026",
    totalPrice: 1500,
    items: [
      { id: 1, title: "Sample Product Item", price: 1500, quantity: 1, image: "https://via.placeholder.com/150" }
    ]
  },
  {
    id: "1564132164873",
    customerName: "Charlie Albarico",
    status: "Pending",
    dateOrdered: "10/23/2026",
    totalPrice: 1500,
    items: [
      { id: 2, title: "Another Product", price: 1500, quantity: 1, image: "https://via.placeholder.com/150" }
    ]
  },
  {
    id: "1564132164874",
    customerName: "Dudes Aro Inihao",
    status: "Ready to Claim",
    dateOrdered: "10/23/2026",
    totalPrice: 1500,
    items: [
      { id: 3, title: "Ready Item", price: 1500, quantity: 1, image: "https://via.placeholder.com/150" }
    ]
  },
  {
    id: "1564132164875",
    customerName: "Dudes Aro Inihao",
    status: "Claimed",
    dateOrdered: "10/23/2026",
    totalPrice: 1500,
    items: [
      { id: 4, title: "Claimed Item", price: 1500, quantity: 1, image: "https://via.placeholder.com/150" }
    ]
  },
  {
    id: "1564132164876",
    customerName: "Dudes Aro Inihao",
    status: "Cancelled",
    dateOrdered: "10/23/2026",
    totalPrice: 1500,
    items: [
      { id: 5, title: "Cancelled Item", price: 1500, quantity: 1, image: "https://via.placeholder.com/150" }
    ]
  },
  {
    id: "1564132164877",
    customerName: "Dudes Aro Inihao",
    status: "Didn't Claimed",
    dateOrdered: "10/20/2026",
    totalPrice: 1500,
    items: [
      { id: 6, title: "Unclaimed Item", price: 1500, quantity: 1, image: "https://via.placeholder.com/150" }
    ]
  }
];

const ORDER_TABS = [
  { name: "Pending", status: "Pending", icon: ShoppingCart },
  { name: "Ready", status: "Ready", icon: Package },
  { name: "Claimed", status: "Claimed", icon: CheckCircle2 },
  { name: "Canceled", status: "Canceled", icon: Ban },
  { name: "Didn't Claimed", status: "Didn't Claimed", icon: AlertTriangle },
];

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState<"Pending" | "Ready" | "Claimed" | "Canceled" | "Didn't Claimed">("Pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [orders, setOrders] = useState<OrderRecord[]>(INITIAL_ORDERS);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<OrderRecord | null>(null);
  const [isCategoryOpen, setIsCategoryOpen] = useState(true);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Status Change Handlers
  const handleUpdateStatus = (id: string, newStatus: OrderRecord["status"]) => {
    setOrders(prev => prev.map(order => order.id === id ? { ...order, status: newStatus } : order));
  };

  // Filter logic based on active tab and search query
  const filteredOrders = orders.filter(order => {
    let targetStatus: OrderRecord["status"] = "Pending";
    if (activeTab === "Pending") targetStatus = "Pending";
    if (activeTab === "Ready") targetStatus = "Ready to Claim";
    if (activeTab === "Claimed") targetStatus = "Claimed";
    if (activeTab === "Canceled") targetStatus = "Cancelled";
    if (activeTab === "Didn't Claimed") targetStatus = "Didn't Claimed";

    const matchesTab = order.status === targetStatus;

    const matchesSearch = 
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.id.includes(searchQuery) ||
      order.dateOrdered.includes(searchQuery);

    return matchesTab && matchesSearch;
  });

  return (
    <section className="bg-[#EBE9E1] min-h-screen w-full py-10 px-4 sm:px-6 relative font-sans">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 items-start">
        
        {/* MOBILE FILTER BUTTON */}
        <div className="w-full lg:hidden">
          <button
            onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
            className="w-full bg-[#3087C5] text-white py-3 px-5 rounded-2xl font-bold flex items-center justify-center space-x-2 shadow-md hover:bg-[#256fa4] transition-colors"
          >
            <Filter className="w-5 h-5" />
            <span>{isMobileFilterOpen ? "Hide Orders Center" : "Orders Navigation Center"}</span>
          </button>
        </div>

        {/* SIDEBAR FILTERS */}
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
                <h3 className="font-black text-gray-900 text-base">Orders Center</h3>
              </div>
              <button className="text-gray-600 hover:text-gray-900">
                {isCategoryOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>

            {/* Category List */}
            {isCategoryOpen && (
              <div className="mt-2 space-y-0 border-t border-gray-300/60 overflow-hidden rounded-none">
                {ORDER_TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isSelected = activeTab === tab.status;
                  return (
                    <button
                      key={tab.name}
                      onClick={() => {
                        setActiveTab(tab.status as any);
                        setIsMobileFilterOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-3 text-xs sm:text-sm font-bold transition-all rounded-none ${
                        isSelected 
                          ? "bg-white text-gray-900 border-l-4 border-[#3087C5] shadow-xs" 
                          : "bg-white/40 text-gray-700 hover:bg-white/70 border-l-4 border-transparent"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="w-4 h-4 text-[#3087C5]" />
                        <span className="truncate text-left">{tab.name}</span>
                      </div>
                      <span className="text-xs font-semibold text-gray-500 bg-gray-200/60 px-2 py-0.5 rounded-full shrink-0">
                        ({orders.filter(o => {
                          if (tab.status === "Pending") return o.status === "Pending";
                          if (tab.status === "Ready") return o.status === "Ready to Claim";
                          if (tab.status === "Claimed") return o.status === "Claimed";
                          if (tab.status === "Canceled") return o.status === "Cancelled";
                          if (tab.status === "Didn't Claimed") return o.status === "Didn't Claimed";
                          return false;
                        }).length})
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 w-full space-y-5">
          
          {/* Header & Search Bar */}
          <div className="bg-white/60 backdrop-blur-xs p-4 rounded-2xl border border-gray-300/60 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <h2 className="text-lg font-black text-[#3087C5]">
              {activeTab === "Canceled" ? "Cancelled Orders" : `${activeTab} Orders`}
            </h2>

            {/* Search Bar */}
            <div className="relative w-full sm:w-80 flex items-center">
              <input
                type="text"
                placeholder="Search..."
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

          {/* Reset Filter info if search query is active */}
          {searchQuery && (
            <div className="flex items-center justify-between bg-white/40 px-4 py-2 rounded-xl text-xs font-bold text-gray-600">
              <span>Showing search results for "{searchQuery}" ({filteredOrders.length})</span>
              <button
                onClick={() => setSearchQuery("")}
                className="text-[#3087C5] hover:underline flex items-center space-x-1"
              >
                <span>Clear Search</span>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Orders List */}
          <div className="space-y-4">
            {filteredOrders.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-gray-200 shadow-sm text-gray-400 font-medium">
                No {activeTab.toLowerCase()} orders found.
              </div>
            ) : (
              filteredOrders.map((order) => (
                <div 
                  key={order.id} 
                  className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 transition-all hover:shadow-md"
                >
                  {/* Order Information */}
                  <div className="flex items-center space-x-4 w-full sm:w-auto">
                    <div className="w-12 h-12 rounded-xl bg-sky-50 text-[#3087C5] flex items-center justify-center shrink-0 border border-sky-100 shadow-2xs">
                      <Package className="w-6 h-6" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="font-black text-gray-900 text-sm sm:text-base">
                        Customer: {order.customerName}
                      </h4>
                      <p className="text-xs font-bold text-gray-700">
                        Order # {order.id}
                      </p>
                      <p className="text-xs font-bold text-gray-700">
                        Status: <span className="text-[#3087C5]">{order.status}</span>
                      </p>
                      <p className="text-xs font-semibold text-gray-500 flex items-center gap-2">
                        <span>Date: {order.dateOrdered}</span>
                        
                        {/* Date to Claim moved next to Order Placed Date for Ready & Didn't Claimed tabs */}
                        {(activeTab === "Ready" || activeTab === "Didn't Claimed") && (
                          <span className="px-2 py-0.5 text-[10px] font-black bg-red-100 text-red-600 rounded-full">
                            Date to Claim: +3 (Overdue / Didn't claim)
                          </span>
                        )}
                      </p>
                      <p className="text-xs font-bold text-gray-900">
                        Total Price: <span className="text-[#3087C5]">₱{order.totalPrice.toLocaleString()}</span>
                      </p>
                    </div>
                  </div>

                  {/* Dynamic Action Buttons */}
                  <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                    
                    {activeTab === "Pending" && (
                      <>
                        <Button
                          variant="gold"
                          size="sm"
                          onClick={() => handleUpdateStatus(order.id, "Ready to Claim")}
                        >
                          <Clock className="w-3.5 h-3.5 mr-1" />
                          <span>Order Ready</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateStatus(order.id, "Cancelled")}
                          className="hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                        >
                          <Ban className="w-3.5 h-3.5 mr-1" />
                          <span>Cancel Order</span>
                        </Button>
                      </>
                    )}

                    {activeTab === "Ready" && (
                      <>
                        <Button
                          variant="gold"
                          size="sm"
                          onClick={() => handleUpdateStatus(order.id, "Claimed")}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          <span>Order Claimed</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateStatus(order.id, "Didn't Claimed")}
                          className="hover:bg-amber-50 hover:text-amber-700"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                          <span>Didn't Claimed</span>
                        </Button>
                      </>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedOrderDetails(order)}
                      className="hover:bg-sky-50 hover:text-[#3087C5]"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      <span>View Details</span>
                    </Button>

                  </div>
                </div>
              ))
            )}
          </div>

        </div>

      </div>

      {/* Order Details Modal Component */}
      {selectedOrderDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[85vh]">
            
            <div className="p-5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#3087C5] text-white flex items-center justify-center shadow-xs">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-gray-900 text-base">Order Details</h3>
                  <p className="text-xs font-bold text-[#3087C5]">Order # {selectedOrderDetails.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrderDetails(null)}
                className="w-8 h-8 rounded-full bg-gray-200/80 hover:bg-gray-300 text-gray-700 flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-gray-600">
              <span>Customer: <span className="text-gray-900">{selectedOrderDetails.customerName}</span></span>
              <span>Status: <span className="text-[#3087C5]">{selectedOrderDetails.status}</span></span>
              <span>Date: {selectedOrderDetails.dateOrdered}</span>
              <span>Total: <span className="text-gray-900 font-black">₱{selectedOrderDetails.totalPrice.toLocaleString()}</span></span>
            </div>

            <div className="p-6 overflow-y-auto space-y-3 flex-1">
              <h4 className="text-xs font-black uppercase text-gray-500 tracking-wider mb-2">
                Items in this Order ({selectedOrderDetails.items.length})
              </h4>
              
              {selectedOrderDetails.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-200 shadow-2xs">
                  <div className="flex items-center space-x-3">
                    <div className="w-14 h-14 rounded-xl bg-white overflow-hidden border border-gray-200 shrink-0">
                      <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h5 className="font-bold text-gray-900 text-xs sm:text-sm">{item.title}</h5>
                      <p className="text-xs text-gray-500 font-medium">Quantity: {item.quantity}</p>
                    </div>
                  </div>
                  <p className="text-sm font-black text-[#3087C5]">
                    ₱{(item.price * item.quantity).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <Button 
                variant="primary"
                size="md"
                onClick={() => setSelectedOrderDetails(null)} 
                className="rounded-full px-6"
              >
                Close
              </Button>
            </div>

          </div>
        </div>
      )}

    </section>
  );
}