import { useState } from "react";
import { Link } from "react-router";
import { ShoppingCart, Eye, XCircle, Sparkles, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";

export type Product = {
  id: number;
  name: string;
  category: string;
  price: string;
  isNew?: boolean;
  inStock: boolean;
  stockCount: number;
  image: string;
  path: string;
};

type ProductCardProps = {
  product: Product;
  onAddToCart: (productName: string, quantity: number) => void;
};

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const [quantity, setQuantity] = useState(1);

  const handleIncrement = () => {
    if (quantity < product.stockCount) {
      setQuantity((prev) => prev + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity((prev) => prev - 1);
    }
  };

  return (
    <div className="bg-white border border-gray-200/80 hover:border-[#3087C5] rounded-2xl p-4 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group/card">
      <div>
        {/* Status Badges Header (Only shows New or Out of Stock) */}
        <div className="flex items-center space-x-1.5 mb-2.5">
          {product.isNew && (
            <span className="inline-flex items-center space-x-1 bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs">
              <Sparkles className="w-3 h-3 text-amber-600" />
              <span>New</span>
            </span>
          )}
          {!product.inStock && (
            <span className="inline-flex items-center space-x-1 bg-rose-100 text-rose-800 text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs">
              <XCircle className="w-3 h-3" />
              <span>Out of Stock</span>
            </span>
          )}
        </div>

        {/* Product Image Box */}
        <Link to={product.path}>
          <div className="w-full h-36 rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center p-2 mb-3">
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover rounded-lg group-hover/card:scale-110 transition-transform duration-500"
            />
          </div>
        </Link>

        {/* Product Title */}
        <Link to={product.path}>
          <h3 className="font-bold text-gray-900 text-sm sm:text-base hover:text-[#3087C5] transition-colors line-clamp-1 mb-0.5">
            {product.name}
          </h3>
        </Link>

        {/* Product Category */}
        <p className="text-xs font-medium text-gray-500 mb-1">
          {product.category}
        </p>

        {/* Actual Stock Count below Category */}
        <p className="text-[11px] font-bold text-sky-700 mb-2">
          Stock Available: <span className="text-gray-900">{product.stockCount} units</span>
        </p>

        {/* Price */}
        <p className="text-sm sm:text-base font-black text-gray-900 mb-3">
          {product.price}
        </p>
      </div>

      {/* Action Controls */}
      <div className="space-y-2.5 pt-1">
        
        {/* Quantity Selector Field */}
        <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5">
          <span className="text-xs font-bold text-gray-600">Quantity</span>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleDecrement}
              disabled={!product.inStock || quantity <= 1}
              className="w-6 h-6 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-100 disabled:opacity-40"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="text-xs font-black text-gray-900 w-6 text-center">{quantity}</span>
            <button
              type="button"
              onClick={handleIncrement}
              disabled={!product.inStock || quantity >= product.stockCount}
              className="w-6 h-6 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-100 disabled:opacity-40"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Add to Cart Button */}
        <Button 
          variant="primary" 
          size="sm" 
          className="w-full justify-center text-xs py-2 shadow-sm"
          disabled={!product.inStock}
          onClick={() => onAddToCart(product.name, quantity)}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span>Add to Cart</span>
        </Button>

        {/* View Product Button */}
        <Link to={product.path} className="block w-full">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-center text-xs py-2 border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <Eye className="w-3.5 h-3.5 text-gray-500" />
            <span>View Product</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}