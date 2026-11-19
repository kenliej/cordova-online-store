import { Package, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OrderRecord } from "@/components/ui/OrderCard";

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrderRecord | null;
}

export function OrderDetailsModal({ isOpen, onClose, order }: OrderDetailsModalProps) {
  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#3087C5] text-white flex items-center justify-center shadow-xs">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-gray-900 text-base">Order Details</h3>
              <p className="text-xs font-bold text-[#3087C5]">Order # {order.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-200/80 hover:bg-gray-300 text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info Bar */}
        <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-gray-600">
          <span>Customer: <span className="text-gray-900">{order.customerName || "Dudes Aro Inihao"}</span></span>
          <span>Status: <span className="text-[#3087C5]">{order.status}</span></span>
          <span>Date: {order.dateOrdered}</span>
          <span>Total: <span className="text-gray-900 font-black">₱{order.totalPrice.toLocaleString()}</span></span>
        </div>

        {/* Items List */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          <h4 className="text-xs font-black uppercase text-gray-500 tracking-wider mb-2">
            Items in this Order ({order.items.length})
          </h4>
          
          {order.items.map((item) => (
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

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <Button 
            variant="primary"
            size="md"
            onClick={onClose} 
            className="rounded-full px-6"
          >
            Close
          </Button>
        </div>

      </div>
    </div>
  );
}