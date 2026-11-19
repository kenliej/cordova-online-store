import { ImageOff, Search, Settings, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPeso } from "@/lib/format";
import type { WorkerProduct } from "@/lib/types";

interface WorkerProductCardProps {
  product: WorkerProduct;
  onEdit: (product: WorkerProduct) => void;
  onView: (product: WorkerProduct) => void;
  onDelete: (product: WorkerProduct) => void;
  deleting?: boolean;
}

export function WorkerProductCard({
  product,
  onEdit,
  onView,
  onDelete,
  deleting = false,
}: WorkerProductCardProps) {
  const isOutOfStock = product.stock === 0;
  const image = product.image || product.images[0] || "";

  return (
    <div className="bg-white border border-gray-200 rounded-3xl p-4 shadow-sm w-full max-w-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
      {/* Top badges & image */}
      <div className="relative w-full h-48 rounded-2xl bg-gray-50 overflow-hidden border border-gray-100 flex items-center justify-center">
        <div className="absolute top-3 left-3 flex flex-col space-y-1.5 z-10">
          {product.isNew && (
            <span className="bg-[#D4A328] text-white text-[11px] font-black px-3 py-0.5 rounded-full shadow-xs uppercase tracking-wider">
              New
            </span>
          )}
          {isOutOfStock && (
            <span className="bg-white text-gray-900 border border-gray-200 text-[11px] font-black px-3 py-0.5 rounded-full shadow-xs">
              Out of Stock
            </span>
          )}
          {!product.isActive && (
            <span className="bg-gray-900 text-white text-[11px] font-black px-3 py-0.5 rounded-full shadow-xs">
              Inactive
            </span>
          )}
        </div>

        {image ? (
          <img
            src={image}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-gray-400">
            <ImageOff className="w-8 h-8" />
            <span className="text-[11px] font-bold">No image</span>
          </div>
        )}
      </div>

      {/* Product info */}
      <div className="space-y-1 px-1">
        <h3 className="font-bold text-gray-900 text-base leading-tight truncate">{product.name}</h3>
        <p className="text-xs text-gray-500 font-semibold truncate">
          {product.category || "Uncategorized"}
        </p>

        <div className="flex items-center justify-between pt-1">
          <span className="text-lg font-black text-gray-900">{formatPeso(product.price)}</span>
          <span className={`text-xs font-bold ${isOutOfStock ? "text-red-600" : "text-emerald-600"}`}>
            Stock: {product.stock}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2 pt-1">
        <Button
          variant="primary"
          size="md"
          onClick={() => onEdit(product)}
          className="w-full justify-center rounded-full font-bold shadow-xs py-2.5"
        >
          <Settings className="w-4 h-4" />
          <span>Update Product</span>
        </Button>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="md"
            onClick={() => onView(product)}
            className="w-full justify-center rounded-full font-bold border-gray-300 text-gray-800 hover:bg-gray-50 shadow-xs py-2.5"
          >
            <Search className="w-4 h-4 text-gray-600" />
            <span>View</span>
          </Button>

          <Button
            variant="outline"
            size="md"
            onClick={() => onDelete(product)}
            loading={deleting}
            className="w-full justify-center rounded-full font-bold border-gray-300 text-red-600 hover:bg-red-50 hover:border-red-200 shadow-xs py-2.5"
          >
            {!deleting && <Trash2 className="w-4 h-4" />}
            <span>Delete</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
