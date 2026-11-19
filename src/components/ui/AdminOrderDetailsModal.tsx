import { CalendarClock, MapPin, Package, Phone, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPeso } from "@/lib/format";
import type { OrderRecord } from "@/lib/types";

interface AdminOrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrderRecord | null;
}

const STATUS_STYLES: Record<string, string> = {
  Pending: "text-[#3087C5]",
  "Ready to Claim": "text-emerald-600",
  Claimed: "text-sky-600",
  Cancelled: "text-rose-600",
  "Didn't Claimed": "text-amber-600",
};

/**
 * Order details used by the admin sales report and the worker order desk.
 * Shows the customer's identity plus the ordered items and fulfilment info.
 */
export function OrderDetailsModal({ isOpen, onClose, order }: AdminOrderDetailsModalProps) {
  if (!isOpen || !order) return null;

  const displayId = order.orderNumber ?? order.id;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans"
      role="dialog"
      aria-modal="true"
      aria-label={`Order ${displayId} details`}
    >
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
            className="w-8 h-8 rounded-full bg-gray-200/80 hover:bg-gray-300 text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Customer / order meta */}
        <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-bold text-gray-600">
          <span className="inline-flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-gray-400" />
            Customer: <span className="text-gray-900">{order.customerName || "—"}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-gray-400" />
            Phone: <span className="text-gray-900">{order.customerPhone || "—"}</span>
          </span>
          <span>
            Status:{" "}
            <span className={`font-extrabold ${STATUS_STYLES[order.status] ?? "text-[#3087C5]"}`}>
              {order.status}
            </span>
          </span>
          <span>Date Ordered: {order.dateOrdered}</span>
          <span>
            Total: <span className="text-gray-900 font-black">{formatPeso(order.totalPrice)}</span>
          </span>
          <span>
            Payment:{" "}
            <span className="text-gray-900">
              {order.paymentMethod === "pay_at_mall" || !order.paymentMethod
                ? "Pay at mall"
                : order.paymentMethod}
            </span>
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

        {/* Items list */}
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
              className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-200 shadow-2xs"
            >
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-14 h-14 rounded-xl bg-white overflow-hidden border border-gray-200 shrink-0 flex items-center justify-center">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.title}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <h5 className="font-bold text-gray-900 text-xs sm:text-sm truncate">
                    {item.title}
                  </h5>
                  <p className="text-xs text-gray-500 font-medium">
                    Quantity: {item.quantity} × {formatPeso(item.price)}
                  </p>
                </div>
              </div>
              <p className="text-sm font-black text-[#3087C5] shrink-0">
                {formatPeso(item.price * item.quantity)}
              </p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3">
          <span className="text-xs font-bold text-gray-500">
            Subtotal: {formatPeso(order.subtotal ?? order.totalPrice)}
          </span>
          <Button variant="primary" size="md" onClick={onClose} className="rounded-full px-6">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
