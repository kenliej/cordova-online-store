import { X, Package, CalendarClock, MapPin } from "lucide-react";
import type { OrderRecord } from "@/components/ui/OrderCard";
import { Button } from "@/components/ui/button";
import { formatPeso } from "@/lib/format";

interface OrderDetailsModalProps {
  order: OrderRecord | null;
  onClose: () => void;
}

export function OrderDetailsModal({ order, onClose }: OrderDetailsModalProps) {
  if (!order) return null;

  const displayId = order.orderNumber ?? order.id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#3087C5] text-white flex items-center justify-center shadow-xs">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-gray-900 text-base">Order Details</h3>
              <p className="text-xs font-bold text-[#3087C5]">Order # {displayId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close order details"
            className="w-8 h-8 rounded-full bg-gray-200/80 hover:bg-gray-300 text-gray-700 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Order Meta Info */}
        <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-gray-600">
          <span>
            Status: <span className="text-[#3087C5]">{order.status}</span>
          </span>
          <span>Date: {order.dateOrdered}</span>
          <span>
            Total: <span className="text-gray-900 font-black">{formatPeso(order.totalPrice)}</span>
          </span>
        </div>

        {(order.claimDeadline || order.pickupLocation) && (
          <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-100 flex flex-wrap items-center gap-4 text-[11px] font-bold text-amber-900">
            {order.claimDeadline && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5" />
                Claim by {order.claimDeadline}
              </span>
            )}
            {order.pickupLocation && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                {order.pickupLocation}
              </span>
            )}
          </div>
        )}

        {/* Product Items List */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          <h4 className="text-xs font-black uppercase text-gray-500 tracking-wider mb-2">
            Items in this Order ({order.items.length})
          </h4>

          {order.items.length === 0 && (
            <p className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-xs font-semibold text-gray-500">
              No items were recorded for this order.
            </p>
          )}

          {order.items.map((item, index) => (
            <div
              key={`${item.id}-${index}`}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-200 shadow-2xs"
            >
              <div className="flex items-center space-x-3">
                <div className="w-14 h-14 rounded-xl bg-white overflow-hidden border border-gray-200 shrink-0">
                  {item.image ? (
                    <img src={item.image} alt={item.title} loading="lazy" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-400">
                      No image
                    </div>
                  )}
                </div>
                <div>
                  <h5 className="font-bold text-gray-900 text-xs sm:text-sm">{item.title}</h5>
                  <p className="text-xs text-gray-500 font-medium">
                    Quantity: {item.quantity} × {formatPeso(item.price)}
                  </p>
                </div>
              </div>
              <p className="text-sm font-black text-[#3087C5]">{formatPeso(item.price * item.quantity)}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3">
          <span className="text-xs font-bold text-gray-500">
            Payment: {order.paymentMethod === "pay_at_mall" || !order.paymentMethod ? "Pay at mall" : order.paymentMethod}
          </span>
          <Button variant="primary" size="md" onClick={onClose} className="rounded-full px-6">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
