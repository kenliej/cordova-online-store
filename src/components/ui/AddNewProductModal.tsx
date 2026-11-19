import { useState } from "react";
import { X, Plus, Upload, Image as ImageIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AddNewProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProduct: (productData: ProductFormData) => void;
}

export interface ProductFormData {
  name: string;
  category: string;
  description: string;
  price: number;
  stocks: number;
  images: string[]; // URLs or file objects preview
}

const CATEGORIES = [
  "Foods & Beverage",
  "Electronics",
  "Beauty & Personal Care",
  "Home & Living",
  "Health & Wellness",
  "Toys & Games",
  "Sports & Outdoors",
  "Books & Stationery",
  "Fashion & Apparel",
  "Computer & Accessories",
  "Others"
];

export function AddNewProductModal({ isOpen, onClose, onAddProduct }: AddNewProductModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<number | "">("");
  const [stocks, setStocks] = useState<number | "">("");
  const [images, setImages] = useState<string[]>([]);

  if (!isOpen) return null;

  // Handle mock image uploads (max 3)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const filesArray = Array.from(e.target.files);
    
    if (images.length + filesArray.length > 3) {
      alert("You can only upload a maximum of 3 images.");
      return;
    }

    // Generate object URLs for previewing
    const newImageUrls = filesArray.map((file) => URL.createObjectURL(file));
    setImages((prev) => [...prev, ...newImageUrls].slice(0, 3));
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !category || price === "" || stocks === "") {
      alert("Please fill in all required fields.");
      return;
    }

    onAddProduct({
      name,
      category,
      description,
      price: Number(price),
      stocks: Number(stocks),
      images,
    });

    // Reset and close
    setName("");
    setCategory(CATEGORIES[0]);
    setDescription("");
    setPrice("");
    setStocks("");
    setImages([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#3087C5] text-white flex items-center justify-center shadow-xs">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-gray-900 text-base">Add New Product</h3>
              <p className="text-xs font-bold text-[#3087C5]">Inventory Management</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-200/80 hover:bg-gray-300 text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body (Scrollable) */}
        <form id="add-product-form" onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          
          {/* Product Name */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700">Product Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sardinas Green Dili"
              className="w-full bg-white border border-gray-300 rounded-xl py-2.5 px-4 text-sm font-medium text-gray-900 focus:outline-none focus:border-[#3087C5] shadow-2xs"
            />
          </div>

          {/* Category Selection */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700">Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-xl py-2.5 px-4 text-sm font-medium text-gray-900 focus:outline-none focus:border-[#3087C5] shadow-2xs cursor-pointer"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Price & Stocks Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Product Price (₱) *</label>
              <input
                type="number"
                min="0"
                step="any"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="0.00"
                className="w-full bg-white border border-gray-300 rounded-xl py-2.5 px-4 text-sm font-medium text-gray-900 focus:outline-none focus:border-[#3087C5] shadow-2xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Stocks Available *</label>
              <input
                type="number"
                min="0"
                required
                value={stocks}
                onChange={(e) => setStocks(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="0"
                className="w-full bg-white border border-gray-300 rounded-xl py-2.5 px-4 text-sm font-medium text-gray-900 focus:outline-none focus:border-[#3087C5] shadow-2xs"
              />
            </div>
          </div>

          {/* Product Description */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700">Product Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide details about the item..."
              className="w-full bg-white border border-gray-300 rounded-xl py-2.5 px-4 text-sm font-medium text-gray-900 focus:outline-none focus:border-[#3087C5] shadow-2xs resize-none"
            />
          </div>

          {/* Image Upload (Limit -> 3 images) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-700">Product Images (Max 3)</label>
              <span className="text-[11px] font-semibold text-gray-500">{images.length}/3 uploaded</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {images.map((url, index) => (
                <div key={index} className="relative h-24 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden group">
                  <img src={url} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute top-1.5 right-1.5 bg-red-600 text-white p-1 rounded-full opacity-90 hover:opacity-100 shadow-sm transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {images.length < 3 && (
                <label className="h-24 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 flex flex-col items-center justify-center cursor-pointer transition-colors">
                  <Upload className="w-5 h-5 text-[#3087C5] mb-1" />
                  <span className="text-[10px] font-bold text-gray-600">Upload Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

        </form>

        {/* Footer Actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end space-x-3">
          <Button 
            variant="outline" 
            size="md" 
            onClick={onClose} 
            className="rounded-full px-5"
          >
            Cancel
          </Button>
          <Button 
            form="add-product-form"
            variant="primary" 
            size="md" 
            type="submit" 
            className="rounded-full px-6 shadow-md"
          >
            <ImageIcon className="w-4 h-4 mr-1.5" />
            <span>Save Product</span>
          </Button>
        </div>

      </div>
    </div>
  );
}