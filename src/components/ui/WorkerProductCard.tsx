import { useState } from "react";
import { Settings, Search, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditProductModal, type WorkerProduct } from "./EditProductModal";

interface WorkerProductCardProps {
  product: WorkerProduct;
  onUpdateProduct?: (updated: WorkerProduct) => void;
}

export function WorkerProductCard({ product, onUpdateProduct }: WorkerProductCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"update" | "view">("update");

  const isOutOfStock = product.stocks === 0;

  const handleOpenUpdate = () => {
    setModalMode("update");
    setIsModalOpen(true);
  };

  const handleOpenView = () => {
    setModalMode("view");
    setIsModalOpen(true);
  };

  return (
    <>
      <EditProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={product}
        mode={modalMode}
        onSave={onUpdateProduct}
      />

      <div className="bg-white border border-gray-200 rounded-3xl p-4 shadow-sm w-full max-w-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
        
        {/* Top Badges & Image Container */}
        <div className="relative w-full h-48 rounded-2xl bg-gray-50 overflow-hidden border border-gray-100 flex items-center justify-center">
          
          {/* Status Tags */}
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
          </div>

          <img 
            src={product.images[0] || "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&auto=format&fit=crop&q=80"} 
            alt={product.name} 
            className="w-full h-full object-cover"
          />
        </div>

        {/* Product Info */}
        <div className="space-y-1 px-1">
          <h3 className="font-bold text-gray-900 text-base leading-tight truncate">
            {product.name}
          </h3>
          <p className="text-xs text-gray-500 font-semibold truncate">
            {product.category}
          </p>

          <div className="flex items-center space-x-1.5 text-xs text-amber-500 font-bold pt-1">
            <Star className="w-3.5 h-3.5 fill-current" />
            <span>4.7 <span className="text-gray-400 font-medium">(76)</span></span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-lg font-black text-gray-900">
              ₱{product.price.toLocaleString()}
            </span>
            <span className={`text-xs font-bold ${isOutOfStock ? "text-red-600" : "text-emerald-600"}`}>
              Stock: {product.stocks}
            </span>
          </div>
        </div>

        {/* Action Buttons using custom Button component */}
        <div className="space-y-2 pt-1">
          <Button
            variant="primary"
            size="md"
            onClick={handleOpenUpdate}
            className="w-full justify-center rounded-full font-bold shadow-xs py-2.5"
          >
            <Settings className="w-4 h-4 mr-1.5" />
            <span>Update Product</span>
          </Button>

          <Button
            variant="outline"
            size="md"
            onClick={handleOpenView}
            className="w-full justify-center rounded-full font-bold border-gray-300 text-gray-800 hover:bg-gray-50 shadow-xs py-2.5"
          >
            <Search className="w-4 h-4 mr-1.5 text-gray-600" />
            <span>View Product</span>
          </Button>
        </div>

      </div>
    </>
  );
}