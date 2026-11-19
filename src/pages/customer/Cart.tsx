import { useState } from "react";
import { 
  ShoppingCart, 
  Package, 
  History, 
  SlidersHorizontal, 
  ChevronUp, 
  ChevronDown, 
  CheckCircle2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CartCard, type CartItem } from "@/components/ui/CartCard";
import { OrderCard, type OrderRecord } from "@/components/ui/OrderCard";
import { OrderDetailsModal } from "@/components/ui/OrderDetailsModal";

// Mock Cart Data matching your screenshot
const INITIAL_CART: CartItem[] = [
  { id: 1, title: "Sardinas Green Dili ni Halang Promise", price: 100, quantity: 5, image: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=300&auto=format&fit=crop&q=80", selected: true },
  { id: 2, title: "Wings Powder 1KG", price: 100, quantity: 5, image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300&auto=format&fit=crop&q=80", selected: true },
  { id: 3, title: "Shampoo para sa mga Gwapo", price: 100, quantity: 5, image: "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=300&auto=format&fit=crop&q=80", selected: true },
  { id: 4, title: "Toothpaste", price: 100, quantity: 5, image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300&auto=format&fit=crop&q=80", selected: true },
  { id: 5, title: "Egg", price: 100, quantity: 5, image: "https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=300&auto=format&fit=crop&q=80", selected: false },
];

const SAMPLE_ITEMS = [
  { id: 101, title: "Sardinas Green Dili ni Halang Promise", price: 100, quantity: 2, image: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=300&auto=format&fit=crop&q=80" },
  { id: 102, title: "Wings Powder 1KG", price: 100, quantity: 1, image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300&auto=format&fit=crop&q=80" },
  { id: 103, title: "Shampoo para sa mga Gwapo", price: 100, quantity: 3, image: "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=300&auto=format&fit=crop&q=80" },
  { id: 104, title: "Toothpaste", price: 100, quantity: 2, image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300&auto=format&fit=crop&q=80" },
  { id: 105, title: "Egg", price: 100, quantity: 4, image: "https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=300&auto=format&fit=crop&q=80" },
];

// Mock Orders Data
const INITIAL_ORDERS: OrderRecord[] = [
  { id: "1564132164872", status: "Pending", dateOrdered: "10/23/2026", totalPrice: 1500, items: SAMPLE_ITEMS },
  { id: "1564132164873", status: "Ready to Claim", dateOrdered: "10/23/2026", totalPrice: 1500, items: SAMPLE_ITEMS },
];

// Mock History Data
const INITIAL_HISTORY: OrderRecord[] = [
  { id: "1564132164874", status: "Claimed", dateOrdered: "10/23/2026", totalPrice: 1500, items: SAMPLE_ITEMS },
  { id: "1564132164875", status: "Cancelled", dateOrdered: "10/23/2026", totalPrice: 1500, items: SAMPLE_ITEMS },
  { id: "1564132164876", status: "Didn't Claimed", dateOrdered: "10/23/2026", totalPrice: 1500, items: SAMPLE_ITEMS },
];

export default function CartPage() {
  const [activeTab, setActiveTab] = useState<"Cart" | "Orders" | "History">("Cart");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const [cartItems, setCartItems] = useState<CartItem[]>(INITIAL_CART);
  const [orders, setOrders] = useState<OrderRecord[]>(INITIAL_ORDERS);
  const [history, setHistory] = useState<OrderRecord[]>(INITIAL_HISTORY);

  const [selectedOrderDetails, setSelectedOrderDetails] = useState<OrderRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Cart Handlers
  const handleToggleSelectAll = () => {
    const allSelected = cartItems.every((item) => item.selected);
    setCartItems(cartItems.map((item) => ({ ...item, selected: !allSelected })));
  };

  const handleToggleSelect = (id: number) => {
    setCartItems(cartItems.map((item) => item.id === id ? { ...item, selected: !item.selected } : item));
  };

  const handleUpdateQty = (id: number, delta: number) => {
    setCartItems(cartItems.map((item) => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const handleRemoveItem = (id: number) => {
    setCartItems(cartItems.filter((item) => item.id !== id));
    setToastMessage("Item removed from cart");
    setTimeout(() => setToastMessage(null), 3000);
  };

  const selectedCount = cartItems.filter((i) => i.selected).reduce((acc, curr) => acc + curr.quantity, 0);
  const totalPrice = cartItems.filter((i) => i.selected).reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);

  const handleCheckout = () => {
    if (selectedCount === 0) {
      alert("Please select items to check out.");
      return;
    }
    setToastMessage("Checkout successful! Order placed.");
    setCartItems(cartItems.filter((i) => !i.selected));
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Orders Cancel Handler
  const handleCancelOrder = (id: string) => {
    const orderToCancel = orders.find((o) => o.id === id);
    if (!orderToCancel) return;

    setOrders(orders.filter((o) => o.id !== id));
    setHistory([{ ...orderToCancel, status: "Cancelled" }, ...history]);
    setToastMessage(`Order #${id} has been cancelled.`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const navTabs = [
    { name: "Cart", icon: ShoppingCart, count: cartItems.length },
    { name: "Orders", icon: Package, count: orders.length },
    { name: "History", icon: History, count: history.length },
  ];

  return (
    <section className="bg-[#EBE9E1] w-full min-h-[85vh] py-10 px-4 sm:px-6 relative font-sans">
      
      {/* Toast Notification Popup */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 border border-white/10 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-sm font-semibold">{toastMessage}</p>
        </div>
      )}

      {/* Order Details Popup Modal */}
      <OrderDetailsModal 
        order={selectedOrderDetails} 
        onClose={() => setSelectedOrderDetails(null)} 
      />

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 items-start">
        
        {/* SIDEBAR FILTERS / NAVIGATION (#E3DFD3 unified background container) */}
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
                <h3 className="font-black text-gray-900 text-base">Shopping Center</h3>
              </div>
              <button className="text-gray-600 hover:text-gray-900">
                {isSidebarOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>

            {/* Navigation Tab List with rounded-none and space-y-0 */}
            {isSidebarOpen && (
              <div className="mt-2 space-y-0 border-t border-gray-300/60 overflow-hidden">
                {navTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isSelected = activeTab === tab.name;
                  return (
                    <button
                      key={tab.name}
                      onClick={() => setActiveTab(tab.name as any)}
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
                      <span className="text-xs font-semibold text-gray-500 bg-gray-200/60 px-2 py-0.5 rounded-full shrink-0">
                        ({tab.count})
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
          
          {/* TAB 1: CART */}
          {activeTab === "Cart" && (
            <div className="space-y-4">
              
              {/* Select All & Summary Header Bar */}
              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-3 w-full sm:w-auto">
                  <input
                    type="checkbox"
                    checked={cartItems.length > 0 && cartItems.every((i) => i.selected)}
                    onChange={handleToggleSelectAll}
                    className="w-5 h-5 text-[#3087C5] rounded border-gray-300 focus:ring-[#3087C5] cursor-pointer"
                  />
                  <span className="font-bold text-gray-900 text-sm">Select All</span>
                </div>

                <div className="flex items-center justify-between sm:justify-end space-x-6 w-full sm:w-auto">
                  <div className="text-xs sm:text-sm font-bold text-gray-700">
                    Items selected: <span className="text-[#3087C5] font-black">{selectedCount}</span>
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-gray-700">
                    Total: <span className="text-gray-900 font-black">₱{totalPrice.toLocaleString()}</span>
                  </div>
                  <Button 
                    variant="gold" 
                    size="md" 
                    onClick={handleCheckout}
                    className="shadow-md font-extrabold uppercase tracking-wider"
                  >
                    <ShoppingCart className="w-4 h-4 mr-1.5" />
                    <span>Check out</span>
                  </Button>
                </div>
              </div>

              {/* Cart Cards List */}
              {cartItems.length > 0 ? (
                <div className="space-y-3">
                  {cartItems.map((item) => (
                    <CartCard
                      key={item.id}
                      item={item}
                      onToggleSelect={handleToggleSelect}
                      onUpdateQty={handleUpdateQty}
                      onRemove={handleRemoveItem}
                      onViewProduct={(product) => alert(`Viewing product: ${product.title}`)}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-3xl p-12 text-center border border-gray-200 shadow-sm">
                  <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="font-bold text-gray-800 text-lg mb-1">Your cart is empty</h3>
                  <p className="text-sm text-gray-500">Explore our catalog and add items to your cart.</p>
                </div>
              )}

            </div>
          )}

          {/* TAB 2: ORDERS */}
          {activeTab === "Orders" && (
            <div className="space-y-4">
              <div className="bg-white/60 backdrop-blur-xs p-4 rounded-2xl border border-gray-300/60 shadow-xs">
                <h2 className="text-lg font-black text-gray-900">Active Orders</h2>
              </div>

              {orders.length > 0 ? (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onCancel={order.status === "Pending" ? handleCancelOrder : undefined}
                      onViewDetails={(ord) => setSelectedOrderDetails(ord)}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-3xl p-12 text-center border border-gray-200 shadow-sm">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="font-bold text-gray-800 text-lg mb-1">No active orders</h3>
                  <p className="text-sm text-gray-500">Your pending or ready-to-claim orders will appear here.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: HISTORY */}
          {activeTab === "History" && (
            <div className="space-y-4">
              <div className="bg-white/60 backdrop-blur-xs p-4 rounded-2xl border border-gray-300/60 shadow-xs">
                <h2 className="text-lg font-black text-gray-900">Order History</h2>
              </div>

              {history.length > 0 ? (
                <div className="space-y-3">
                  {history.map((record) => (
                    <OrderCard
                      key={record.id}
                      order={record}
                      onViewDetails={(ord) => setSelectedOrderDetails(ord)}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-3xl p-12 text-center border border-gray-200 shadow-sm">
                  <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="font-bold text-gray-800 text-lg mb-1">No order history</h3>
                  <p className="text-sm text-gray-500">Completed or cancelled orders will appear here.</p>
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </section>
  );
}