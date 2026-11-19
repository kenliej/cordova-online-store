import { useState } from "react";
import { 
  
  ChevronLeft, 
  ChevronRight, 
  SlidersHorizontal, 
  ChevronUp, 
  ChevronDown,
  CheckCircle2,
  Ban,
  AlertTriangle,
  TrendingUp,
  Calendar
} from "lucide-react";

import { OrderCard, type OrderRecord } from "@/components/ui/OrderCard";
import { OrderDetailsModal } from "@/components/ui/AdminOrderDetailsModal";

// Mock Sales Orders Data spanning multiple dates and statuses
const INITIAL_SALES_ORDERS: OrderRecord[] = [
  {
    id: "1564132164872",
    customerName: "Dudes Aro Inihao",
    status: "Claimed", // Represents Complete
    dateOrdered: "10/22/2026",
    totalPrice: 1500,
    items: [{ id: 1, title: "Wireless Vacuum Cleaner", price: 1500, quantity: 1, image: "https://images.unsplash.com/photo-1558317374-067fb5f30001?w=500&auto=format&fit=crop&q=80" }]
  },
  {
    id: "1564132164873",
    customerName: "Sherwynn James",
    status: "Claimed",
    dateOrdered: "10/22/2026",
    totalPrice: 2500,
    items: [{ id: 2, title: "Drink Dispenser 10L", price: 2500, quantity: 1, image: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=500&auto=format&fit=crop&q=80" }]
  },
  {
    id: "1564132164874",
    customerName: "Shermaine Misula",
    status: "Claimed",
    dateOrdered: "10/23/2026",
    totalPrice: 3200,
    items: [{ id: 3, title: "Alloy Wheel Rim", price: 3200, quantity: 1, image: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=500&auto=format&fit=crop&q=80" }]
  },
  {
    id: "1564132164875",
    customerName: "Charlie Albarico",
    status: "Cancelled",
    dateOrdered: "10/22/2026",
    totalPrice: 1200,
    items: [{ id: 4, title: "Stylus Pen", price: 1200, quantity: 1, image: "https://images.unsplash.com/photo-1583292650931-196e45d4d3c2?w=500&auto=format&fit=crop&q=80" }]
  },
  {
    id: "1564132164876",
    customerName: "Dudes Aro Inihao",
    status: "Cancelled",
    dateOrdered: "10/23/2026",
    totalPrice: 800,
    items: [{ id: 5, title: "Phone Case", price: 800, quantity: 1, image: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=500&auto=format&fit=crop&q=80" }]
  },
  {
    id: "1564132164877",
    customerName: "Dudes Aro Inihao",
    status: "Didn't Claimed",
    dateOrdered: "10/22/2026",
    totalPrice: 1500,
    items: [{ id: 6, title: "Unclaimed Item Pack", price: 1500, quantity: 1, image: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500&auto=format&fit=crop&q=80" }]
  },
  {
    id: "1564132164878",
    customerName: "Alex Smith",
    status: "Didn't Claimed",
    dateOrdered: "10/24/2026",
    totalPrice: 2100,
    items: [{ id: 7, title: "Smart LED Bulb Set", price: 2100, quantity: 1, image: "https://images.unsplash.com/photo-1550985616-11b11651e60f?w=500&auto=format&fit=crop&q=80" }]
  },
];

export default function Sales() {
  const [activeTab, setActiveTab] = useState<"Dashboard" | "Complete" | "Cancelled" | "Didn't Claimed">("Dashboard");
  const [selectedDate, setSelectedDate] = useState("10/22/2026");
  const [orders, ] = useState<OrderRecord[]>(INITIAL_SALES_ORDERS);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<OrderRecord | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Date Pagination Handler (Simulated day stepper)
  const handleDateChange = (direction: "prev" | "next") => {
    if (selectedDate === "10/22/2026") {
      setSelectedDate(direction === "next" ? "10/23/2026" : "10/24/2026");
    } else if (selectedDate === "10/23/2026") {
      setSelectedDate(direction === "next" ? "10/24/2026" : "10/22/2026");
    } else {
      setSelectedDate(direction === "next" ? "10/22/2026" : "10/23/2026");
    }
  };

  // Filtered orders based on active tab and selected date
  const completeOrders = orders.filter(o => o.status === "Claimed" && o.dateOrdered === selectedDate);
  const cancelledOrders = orders.filter(o => o.status === "Cancelled" && o.dateOrdered === selectedDate);
  const unclaimedOrders = orders.filter(o => o.status === "Didn't Claimed" && o.dateOrdered === selectedDate);

  // Totals for the selected date
  const dateRevenue = completeOrders.reduce((sum, o) => sum + o.totalPrice, 0);
  const dateCancelledTotal = cancelledOrders.reduce((sum, o) => sum + o.totalPrice, 0);
  const dateUnclaimedTotal = unclaimedOrders.reduce((sum, o) => sum + o.totalPrice, 0);

  // Overall Dashboard stats
  const totalMonthlyRevenue = orders.filter(o => o.status === "Claimed").reduce((sum, o) => sum + o.totalPrice, 0);
  const totalCancelledCount = orders.filter(o => o.status === "Cancelled").length;
  const totalUnclaimedCount = orders.filter(o => o.status === "Didn't Claimed").length;

  const tabs = [
    { name: "Dashboard", key: "Dashboard", icon: TrendingUp },
    { name: "Complete", key: "Complete", icon: CheckCircle2 },
    { name: "Cancelled", key: "Cancelled", icon: Ban },
    { name: "Didn't Claimed", key: "Didn't Claimed", icon: AlertTriangle },
  ];

  return (
    <section className="bg-[#EBE9E1] min-h-screen w-full py-10 px-4 sm:px-6 relative font-sans">
      
      {/* Order Details Modal */}
      <OrderDetailsModal 
        isOpen={!!selectedOrderDetails} 
        onClose={() => setSelectedOrderDetails(null)} 
        order={selectedOrderDetails} 
      />

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 items-start">
        
        {/* SIDEBAR NAVIGATION */}
        <aside className="w-full lg:w-85 shrink-0 bg-[#E3DFD3] border border-gray-300/80 rounded-2xl p-5 shadow-sm space-y-6">
          <div>
            <div 
              className="flex items-center justify-between cursor-pointer pb-3"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#3087C5] text-white flex items-center justify-center shadow-xs">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <h3 className="font-black text-gray-900 text-base">Sales Center</h3>
              </div>
              <button className="text-gray-600 hover:text-gray-900">
                {isSidebarOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>

            {isSidebarOpen && (
              <div className="mt-2 space-y-0 border-t border-gray-300/60 overflow-hidden">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isSelected = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key as any)}
                      className={`w-full flex items-center justify-between px-3.5 py-3 text-xs sm:text-sm font-bold transition-all rounded-none ${
                        isSelected 
                          ? "bg-white text-gray-900 border-l-4 border-[#3087C5] shadow-xs" 
                          : "bg-white/40 text-gray-700 hover:bg-white/70 border-l-4 border-transparent"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="w-4 h-4 text-[#3087C5]" />
                        <span className="truncate text-left">{tab.name}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 w-full space-y-6">
          
          {/* HEADER & DATE PAGINATION BAR (Hidden on Dashboard tab) */}
          {activeTab !== "Dashboard" ? (
            <div className="bg-white/60 backdrop-blur-xs p-4 rounded-2xl border border-gray-300/60 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <h2 className="text-base sm:text-lg font-black text-[#3087C5]">
                {activeTab === "Complete" && `Revenue: ₱${dateRevenue.toLocaleString()}`}
                {activeTab === "Cancelled" && `Cancelled Total: ₱${dateCancelledTotal.toLocaleString()} (${cancelledOrders.length})`}
                {activeTab === "Didn't Claimed" && `Didn't Claimed Total: ₱${dateUnclaimedTotal.toLocaleString()} (${unclaimedOrders.length})`}
              </h2>

              {/* Date Pagination Controls matching reference image[cite: 13] */}
              <div className="flex items-center space-x-2 bg-white border border-gray-300 rounded-full px-3 py-1.5 shadow-2xs">
                <button 
                  onClick={() => handleDateChange("prev")}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="Previous date"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center space-x-1.5 px-3 text-xs sm:text-sm font-black text-gray-800">
                  <Calendar className="w-4 h-4 text-[#3087C5]" />
                  <span>Date: {selectedDate}</span>
                </div>
                <button 
                  onClick={() => handleDateChange("next")}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="Next date"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white/60 backdrop-blur-xs p-5 rounded-2xl border border-gray-300/60 shadow-xs">
              <h2 className="text-xl font-black text-[#3087C5]">Sales & Performance Overview</h2>
              <p className="text-xs font-medium text-gray-500 mt-0.5">Summary of all revenue, cancellations, and unclaimed records.</p>
            </div>
          )}

          {/* TAB 1: DASHBOARD (New feature) */}
          {activeTab === "Dashboard" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              
              <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-2">
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#3087C5] flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Revenue (Monthly)</p>
                <h3 className="text-2xl font-black text-gray-900">₱{totalMonthlyRevenue.toLocaleString()}</h3>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-2">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                  <Ban className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Cancelled Orders</p>
                <h3 className="text-2xl font-black text-red-600">{totalCancelledCount}</h3>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-2">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Didn't Claimed</p>
                <h3 className="text-2xl font-black text-amber-600">{totalUnclaimedCount}</h3>
              </div>

            </div>
          )}

          {/* TAB 2: COMPLETE ORDERS */}
          {activeTab === "Complete" && (
            <div className="space-y-4">
              {completeOrders.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-gray-200 shadow-sm text-gray-400 font-medium">
                  No completed sales records found for {selectedDate}.
                </div>
              ) : (
                completeOrders.map((order) => (
                  <OrderCard 
                    key={order.id} 
                    order={order} 
                    onViewDetails={(ord) => setSelectedOrderDetails(ord)} 
                  />
                ))
              )}
            </div>
          )}

          {/* TAB 3: CANCELLED ORDERS */}
          {activeTab === "Cancelled" && (
            <div className="space-y-4">
              {cancelledOrders.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-gray-200 shadow-sm text-gray-400 font-medium">
                  No cancelled orders found for {selectedDate}.
                </div>
              ) : (
                cancelledOrders.map((order) => (
                  <OrderCard 
                    key={order.id} 
                    order={order} 
                    onViewDetails={(ord) => setSelectedOrderDetails(ord)} 
                  />
                ))
              )}
            </div>
          )}

          {/* TAB 4: DIDN'T CLAIMED ORDERS */}
          {activeTab === "Didn't Claimed" && (
            <div className="space-y-4">
              {unclaimedOrders.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-gray-200 shadow-sm text-gray-400 font-medium">
                  No unclaimed orders found for {selectedDate}.
                </div>
              ) : (
                unclaimedOrders.map((order) => (
                  <OrderCard 
                    key={order.id} 
                    order={order} 
                    onViewDetails={(ord) => setSelectedOrderDetails(ord)} 
                  />
                ))
              )}
            </div>
          )}

        </div>

      </div>
    </section>
  );
}