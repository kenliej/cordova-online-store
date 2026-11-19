import { Package, Search, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface OrderItem {
  id: number;
  title: string;
  price: number;
  quantity: number;
  image: string;
}

export interface OrderRecord {
  id: string;
  customerName?: string; // <--- Add this line here
  status: "Pending" | "Ready to Claim" | "Claimed" | "Cancelled" | "Didn't Claimed";
  dateOrdered: string;
  dateReady?: string;
  totalPrice: number;
  items: OrderItem[];
}

interface OrderCardProps {
  order: OrderRecord;
  onCancel?: (id: string) => void;
  onViewDetails: (order: OrderRecord) => void;
}

export function OrderCard({ order, onCancel, onViewDetails }: OrderCardProps) {
  const isPending = order.status === "Pending";

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
      
      {/* Icon & Order Details */}
      <div className="flex items-center space-x-4 w-full sm:w-auto">
        <div className="w-12 h-12 rounded-xl bg-sky-50 text-[#3087C5] flex items-center justify-center shrink-0 border border-sky-100 shadow-2xs">
          <Package className="w-6 h-6" />
        </div>
        <div className="space-y-0.5">
          <h4 className="font-black text-gray-900 text-sm sm:text-base">
            Order # {order.id}
          </h4>
          <p className="text-xs font-bold text-gray-700">
            Status:{" "}
            <span className={`font-extrabold ${
              order.status === "Pending" ? "text-[#3087C5]" :
              order.status === "Ready to Claim" ? "text-emerald-600" :
              order.status === "Claimed" ? "text-sky-600" : "text-amber-600"
            }`}>
              {order.status}
            </span>
          </p>
          <p className="text-xs font-semibold text-gray-500">
            Date: {order.dateOrdered}
          </p>
          <p className="text-xs font-bold text-gray-900">
            Total Price: <span className="text-[#3087C5]">₱{order.totalPrice.toLocaleString()}</span>
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
        {isPending && onCancel && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onCancel(order.id)}
            className="rounded-full text-xs font-bold border-gray-300 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
          >
            <Ban className="w-3.5 h-3.5 mr-1" />
            <span>Cancel Order</span>
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => onViewDetails(order)}
          className="rounded-full text-xs font-bold border-gray-300 hover:bg-sky-50 hover:text-[#3087C5]"
        >
          <Search className="w-3.5 h-3.5 mr-1" />
          <span>View Details</span>
        </Button>
      </div>

    </div>
  );
}