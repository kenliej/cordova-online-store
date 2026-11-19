import { Search, Trash2, Plus, Minus } from "lucide-react";

export interface CartItem {
  id: number;
  title: string;
  price: number;
  quantity: number;
  image: string;
  selected: boolean;
}

interface CartCardProps {
  item: CartItem;
  onToggleSelect: (id: number) => void;
  onUpdateQty: (id: number, delta: number) => void;
  onRemove: (id: number) => void;
  onViewProduct: (item: CartItem) => void;
}

export function CartCard({ item, onToggleSelect, onUpdateQty, onRemove, onViewProduct }: CartCardProps) {
  // Calculate total price based on current quantity
  const itemTotal = item.price * item.quantity;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
      
      {/* Checkbox & Product Image + Info */}
      <div className="flex items-center space-x-4 w-full sm:w-auto">
        <input
          type="checkbox"
          checked={item.selected}
          onChange={() => onToggleSelect(item.id)}
          className="w-5 h-5 text-[#3087C5] rounded border-gray-300 focus:ring-[#3087C5] cursor-pointer shrink-0"
        />

        <div className="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden border border-gray-200 shrink-0">
          <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
        </div>

        <div className="space-y-1">
          <h4 className="font-bold text-gray-900 text-sm sm:text-base leading-tight">
            {item.title}
          </h4>
          <div className="flex items-center space-x-2 text-xs font-semibold text-gray-700">
            <span>Quantity:</span>
            <div className="inline-flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white">
              <button
                type="button"
                onClick={() => onUpdateQty(item.id, -1)}
                className="px-2 py-0.5 bg-gray-50 hover:bg-gray-200 text-gray-700 transition-colors"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="px-3 text-xs font-bold text-gray-900">{item.quantity}</span>
              <button
                type="button"
                onClick={() => onUpdateQty(item.id, 1)}
                className="px-2 py-0.5 bg-gray-50 hover:bg-gray-200 text-gray-700 transition-colors"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
          <div className="text-xs font-bold text-gray-900 flex items-center space-x-3">
            <span>Price: <span className="text-gray-600 font-medium">₱{item.price.toLocaleString()}</span></span>
            <span>Total: <span className="text-[#3087C5]">₱{itemTotal.toLocaleString()}</span></span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
        <button
          type="button"
          onClick={() => onViewProduct(item)}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors shadow-2xs"
        >
          <Search className="w-3.5 h-3.5 text-gray-600" />
          <span>View Product</span>
        </button>

        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors shadow-2xs"
        >
          <Trash2 className="w-3.5 h-3.5 text-gray-600" />
          <span>Remove</span>
        </button>
      </div>

    </div>
  );
}