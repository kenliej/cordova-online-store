import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  ShoppingCart,
  Package,
  History,
  SlidersHorizontal,
  ChevronUp,
  ChevronDown,
  PackageSearch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CartCard } from "@/components/ui/CartCard";
import { OrderCard } from "@/components/ui/OrderCard";
import { OrderDetailsModal } from "@/components/ui/OrderDetailsModal";
import { EmptyState, ErrorBanner, ListSkeleton } from "@/components/common/Feedback";
import { useToast } from "@/components/common/Toast";
import { useAuth } from "@/context/AuthContext";
import {
  cancelOrder,
  checkout,
  fetchCart,
  fetchOrders,
  getErrorMessage,
  removeCartItem,
  updateCartItem,
} from "@/lib/api";
import { formatPeso } from "@/lib/format";
import type { CartData, CartItem, OrderRecord } from "@/lib/types";

type Tab = "Cart" | "Orders" | "History";

export default function CartPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { refreshCartCount } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>("Cart");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [cart, setCart] = useState<CartData | null>(null);
  const [isCartLoading, setIsCartLoading] = useState(true);
  const [cartError, setCartError] = useState("");
  const [pendingItemIds, setPendingItemIds] = useState<number[]>([]);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [history, setHistory] = useState<OrderRecord[]>([]);
  const [isOrdersLoading, setIsOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState("");
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const [selectedOrderDetails, setSelectedOrderDetails] = useState<OrderRecord | null>(null);

  const cartItems = cart?.items ?? [];
  const selectedItems = useMemo(() => cartItems.filter((item) => item.selected), [cartItems]);
  const selectedCount = useMemo(
    () => selectedItems.reduce((sum, item) => sum + item.quantity, 0),
    [selectedItems],
  );
  const totalPrice = useMemo(
    () => selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [selectedItems],
  );

  const loadCart = useCallback(async () => {
    setIsCartLoading(true);
    setCartError("");
    try {
      const data = await fetchCart();
      setCart(data);
    } catch (error) {
      setCartError(getErrorMessage(error, "Could not load your cart. Please try again."));
      setCart(null);
    } finally {
      setIsCartLoading(false);
    }
  }, []);

  const loadOrders = useCallback(async () => {
    setIsOrdersLoading(true);
    setOrdersError("");
    try {
      const [active, past] = await Promise.all([
        fetchOrders({ status: "active", perPage: 50 }),
        fetchOrders({ status: "history", perPage: 50 }),
      ]);
      setOrders(active.items);
      setHistory(past.items);
    } catch (error) {
      setOrdersError(getErrorMessage(error, "Could not load your orders. Please try again."));
      setOrders([]);
      setHistory([]);
    } finally {
      setIsOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCart();
    void loadOrders();
  }, [loadCart, loadOrders]);

  useEffect(() => {
    if (activeTab !== "Cart") void loadOrders();
  }, [activeTab, loadOrders]);

  const markPending = (id: number, pending: boolean) => {
    setPendingItemIds((current) =>
      pending ? [...current, id] : current.filter((itemId) => itemId !== id),
    );
  };

  const applyCartItemChange = (id: number, patch: Partial<CartItem>) => {
    setCart((current) =>
      current
        ? {
            ...current,
            items: current.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
          }
        : current,
    );
  };

  const handleToggleSelect = async (id: number) => {
    const item = cartItems.find((entry) => entry.id === id);
    if (!item || pendingItemIds.includes(id)) return;
    const nextSelected = !item.selected;
    applyCartItemChange(id, { selected: nextSelected });
    markPending(id, true);
    try {
      await updateCartItem(id, { selected: nextSelected });
    } catch (error) {
      applyCartItemChange(id, { selected: item.selected });
      toast.error(getErrorMessage(error, "Could not update the item selection."));
    } finally {
      markPending(id, false);
    }
  };

  const handleToggleSelectAll = async () => {
    if (cartItems.length === 0) return;
    const shouldSelect = !cartItems.every((item) => item.selected);
    const previous = cartItems;
    setCart((current) =>
      current ? { ...current, items: current.items.map((item) => ({ ...item, selected: shouldSelect })) } : current,
    );
    try {
      await Promise.all(
        previous
          .filter((item) => item.selected !== shouldSelect)
          .map((item) => updateCartItem(item.id, { selected: shouldSelect })),
      );
    } catch (error) {
      setCart((current) => (current ? { ...current, items: previous } : current));
      toast.error(getErrorMessage(error, "Could not update the cart selection."));
    }
  };

  const handleUpdateQty = async (id: number, delta: number) => {
    const item = cartItems.find((entry) => entry.id === id);
    if (!item || pendingItemIds.includes(id)) return;
    const nextQuantity = Math.max(1, item.quantity + delta);
    if (item.stock > 0 && nextQuantity > item.stock) {
      toast.error(`Only ${item.stock} unit${item.stock === 1 ? "" : "s"} available for "${item.title}".`);
      return;
    }
    applyCartItemChange(id, { quantity: nextQuantity });
    markPending(id, true);
    try {
      await updateCartItem(id, { quantity: nextQuantity });
      await refreshCartCount();
    } catch (error) {
      applyCartItemChange(id, { quantity: item.quantity });
      toast.error(getErrorMessage(error, "Could not update the quantity."));
    } finally {
      markPending(id, false);
    }
  };

  const handleRemoveItem = async (id: number) => {
    if (pendingItemIds.includes(id)) return;
    const item = cartItems.find((entry) => entry.id === id);
    markPending(id, true);
    try {
      await removeCartItem(id);
      setCart((current) =>
        current ? { ...current, items: current.items.filter((entry) => entry.id !== id) } : current,
      );
      await refreshCartCount();
      toast.success("Item removed from cart");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not remove this item from your cart."));
    } finally {
      markPending(id, false);
    }
    if (item) setSelectedOrderDetails((current) => current);
  };

  const handleCheckout = async () => {
    if (selectedItems.length === 0) {
      toast.error("Please select items to check out.");
      return;
    }
    setIsCheckingOut(true);
    try {
      const result = await checkout({ itemIds: selectedItems.map((item) => item.id) });
      toast.success(result.message);
      await Promise.all([loadCart(), loadOrders(), refreshCartCount()]);
      setActiveTab("Orders");
    } catch (error) {
      toast.error(getErrorMessage(error, "Checkout failed. Please try again."));
      await loadCart();
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleCancelOrder = async (id: string) => {
    const order = orders.find((entry) => entry.id === id);
    if (!order || cancellingId !== null) return;
    const dbId = order.dbId ?? Number.parseInt(order.id, 10);
    if (!Number.isFinite(dbId)) {
      toast.error("This order cannot be cancelled right now.");
      return;
    }
    setCancellingId(dbId);
    try {
      await cancelOrder(dbId);
      toast.success(`Order #${order.orderNumber ?? order.id} has been cancelled.`);
      await loadOrders();
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not cancel this order."));
      await loadOrders();
    } finally {
      setCancellingId(null);
    }
  };

  const navTabs: { name: Tab; icon: typeof ShoppingCart; count: number }[] = [
    { name: "Cart", icon: ShoppingCart, count: cartItems.reduce((sum, item) => sum + item.quantity, 0) },
    { name: "Orders", icon: Package, count: orders.length },
    { name: "History", icon: History, count: history.length },
  ];

  return (
    <section className="bg-[#EBE9E1] w-full min-h-[85vh] py-10 px-4 sm:px-6 relative font-sans">
      {/* Order Details Popup Modal */}
      <OrderDetailsModal order={selectedOrderDetails} onClose={() => setSelectedOrderDetails(null)} />

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 items-start">
        {/* SIDEBAR NAVIGATION (#E3DFD3 unified background container) */}
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
              <button className="text-gray-600 hover:text-gray-900" aria-label="Toggle shopping center menu">
                {isSidebarOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>

            {/* Navigation Tab List */}
            {isSidebarOpen && (
              <div className="mt-2 space-y-0 border-t border-gray-300/60 overflow-hidden">
                {navTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isSelected = activeTab === tab.name;
                  return (
                    <button
                      key={tab.name}
                      onClick={() => setActiveTab(tab.name)}
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
              {isCartLoading && <ListSkeleton count={4} />}

              {!isCartLoading && cartError && <ErrorBanner message={cartError} onRetry={() => void loadCart()} />}

              {!isCartLoading && !cartError && (
                <>
                  {/* Select All & Summary Header Bar */}
                  <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center space-x-3 w-full sm:w-auto">
                      <input
                        type="checkbox"
                        checked={cartItems.length > 0 && cartItems.every((item) => item.selected)}
                        onChange={() => void handleToggleSelectAll()}
                        disabled={cartItems.length === 0}
                        aria-label="Select all cart items"
                        className="w-5 h-5 text-[#3087C5] rounded border-gray-300 focus:ring-[#3087C5] cursor-pointer"
                      />
                      <span className="font-bold text-gray-900 text-sm">Select All</span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between sm:justify-end gap-4 sm:gap-6 w-full sm:w-auto">
                      <div className="text-xs sm:text-sm font-bold text-gray-700">
                        Items selected: <span className="text-[#3087C5] font-black">{selectedCount}</span>
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-gray-700">
                        Total: <span className="text-gray-900 font-black">{formatPeso(totalPrice)}</span>
                      </div>
                      <Button
                        variant="gold"
                        size="md"
                        onClick={() => void handleCheckout()}
                        disabled={isCheckingOut || selectedItems.length === 0}
                        loading={isCheckingOut}
                        className="shadow-md font-extrabold uppercase tracking-wider"
                      >
                        {!isCheckingOut && <ShoppingCart className="w-4 h-4 mr-1.5" />}
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
                          onToggleSelect={(id) => void handleToggleSelect(id)}
                          onUpdateQty={(id, delta) => void handleUpdateQty(id, delta)}
                          onRemove={(id) => void handleRemoveItem(id)}
                          onViewProduct={(product) => navigate(`/products/${product.slug}`)}
                          pending={pendingItemIds.includes(item.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={<ShoppingCart className="w-12 h-12" />}
                      title="Your cart is empty"
                      description="Explore our catalog and add items to your cart."
                      action={
                        <Button variant="primary" size="md" onClick={() => navigate("/products")}>
                          Browse Products
                        </Button>
                      }
                    />
                  )}
                </>
              )}
            </div>
          )}

          {/* TAB 2: ORDERS */}
          {activeTab === "Orders" && (
            <div className="space-y-4">
              <div className="bg-white/60 backdrop-blur-xs p-4 rounded-2xl border border-gray-300/60 shadow-xs flex items-center justify-between gap-2">
                <h2 className="text-lg font-black text-gray-900">Active Orders</h2>
                <Button variant="outline" size="sm" onClick={() => void loadOrders()} className="rounded-full text-xs">
                  Refresh
                </Button>
              </div>

              {isOrdersLoading && <ListSkeleton count={2} />}
              {!isOrdersLoading && ordersError && (
                <ErrorBanner message={ordersError} onRetry={() => void loadOrders()} />
              )}
              {!isOrdersLoading && !ordersError && orders.length === 0 && (
                <EmptyState
                  icon={<Package className="w-12 h-12" />}
                  title="No active orders"
                  description="Your pending or ready-to-claim orders will appear here."
                />
              )}
              {!isOrdersLoading && !ordersError && orders.length > 0 && (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onCancel={order.status === "Pending" ? (id) => void handleCancelOrder(id) : undefined}
                      cancelling={cancellingId === order.dbId}
                      onViewDetails={(record) => setSelectedOrderDetails(record)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: HISTORY */}
          {activeTab === "History" && (
            <div className="space-y-4">
              <div className="bg-white/60 backdrop-blur-xs p-4 rounded-2xl border border-gray-300/60 shadow-xs flex items-center justify-between gap-2">
                <h2 className="text-lg font-black text-gray-900">Order History</h2>
                <Button variant="outline" size="sm" onClick={() => void loadOrders()} className="rounded-full text-xs">
                  Refresh
                </Button>
              </div>

              {isOrdersLoading && <ListSkeleton count={2} />}
              {!isOrdersLoading && ordersError && (
                <ErrorBanner message={ordersError} onRetry={() => void loadOrders()} />
              )}
              {!isOrdersLoading && !ordersError && history.length === 0 && (
                <EmptyState
                  icon={<PackageSearch className="w-12 h-12" />}
                  title="No order history"
                  description="Completed or cancelled orders will appear here."
                />
              )}
              {!isOrdersLoading && !ordersError && history.length > 0 && (
                <div className="space-y-3">
                  {history.map((record) => (
                    <OrderCard
                      key={record.id}
                      order={record}
                      onViewDetails={(order) => setSelectedOrderDetails(order)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
