import { useState, useEffect } from "react";
import { X, Store as StoreIcon, Upload,  Eye, Edit3, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface StoreItem {
  id: number | string;
  name: string;
  category: string;
  time: string;
  phone: string;
  isOpen: boolean;
  image: string;
  description?: string;
}

interface AdminStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: StoreItem | null;
  mode: "create" | "update" | "view";
  onSave?: (storeData: StoreItem) => void;
}

const CATEGORIES = [
  "Foods & Beverages",
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

export function AdminStoreModal({ isOpen, onClose, store, mode, onSave }: AdminStoreModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [time, setTime] = useState("6:00AM - 11:00PM");
  const [phone, setPhone] = useState("");
  const [isOpenStatus, setIsOpenStatus] = useState(true);
  const [image, setImage] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (store && mode !== "create") {
      setName(store.name);
      setCategory(store.category || CATEGORIES[0]);
      setTime(store.time || "6:00AM - 11:00PM");
      setPhone(store.phone || "");
      setIsOpenStatus(store.isOpen);
      setImage(store.image || "");
      setDescription(store.description || "");
    } else {
      setName("");
      setCategory(CATEGORIES[0]);
      setTime("6:00AM - 11:00PM");
      setPhone("");
      setIsOpenStatus(true);
      setImage("");
      setDescription("");
    }
  }, [store, mode, isOpen]);

  if (!isOpen) return null;

  const isViewOnly = mode === "view";

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isViewOnly || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const imageUrl = URL.createObjectURL(file);
    setImage(imageUrl);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewOnly) {
      onClose();
      return;
    }

    if (!name || !category || !phone) {
      alert("Please fill in all required store fields.");
      return;
    }

    if (onSave) {
      onSave({
        id: store ? store.id : Date.now(),
        name,
        category,
        time,
        phone,
        isOpen: isOpenStatus,
        image: image || "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=500&auto=format&fit=crop&q=80",
        description,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#3087C5] text-white flex items-center justify-center shadow-xs">
              {mode === "create" ? <Plus className="w-5 h-5" /> : mode === "update" ? <Edit3 className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-black text-gray-900 text-base">
                {mode === "create" ? "Add New Store" : mode === "update" ? "Update Store Details" : "View Store Information"}
              </h3>
              <p className="text-xs font-bold text-[#3087C5]">Mall Directory Management</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-200/80 hover:bg-gray-300 text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form id="store-form" onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          
          {/* Store Name */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700">Store Name *</label>
            <input
              type="text"
              required
              disabled={isViewOnly}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. McDonald's"
              className="w-full bg-white border border-gray-300 rounded-xl py-2.5 px-4 text-sm font-medium text-gray-900 focus:outline-none focus:border-[#3087C5] disabled:bg-gray-100 shadow-2xs"
            />
          </div>

          {/* Category Selection */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700">Category *</label>
            <select
              value={category}
              disabled={isViewOnly}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-xl py-2.5 px-4 text-sm font-medium text-gray-900 focus:outline-none focus:border-[#3087C5] disabled:bg-gray-100 shadow-2xs cursor-pointer"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Time & Phone Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Operating Hours *</label>
              <input
                type="text"
                required
                disabled={isViewOnly}
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="6:00AM - 11:00PM"
                className="w-full bg-white border border-gray-300 rounded-xl py-2.5 px-4 text-sm font-medium text-gray-900 focus:outline-none focus:border-[#3087C5] disabled:bg-gray-100 shadow-2xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Contact Number *</label>
              <input
                type="text"
                required
                disabled={isViewOnly}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0953967329"
                className="w-full bg-white border border-gray-300 rounded-xl py-2.5 px-4 text-sm font-medium text-gray-900 focus:outline-none focus:border-[#3087C5] disabled:bg-gray-100 shadow-2xs"
              />
            </div>
          </div>

          {/* Is Open Status Checkbox */}
          <div className="flex items-center space-x-3 pt-1">
            <input
              type="checkbox"
              id="isOpenStatus"
              disabled={isViewOnly}
              checked={isOpenStatus}
              onChange={(e) => setIsOpenStatus(e.target.checked)}
              className="w-4 h-4 text-[#3087C5] rounded border-gray-300 focus:ring-[#3087C5]"
            />
            <label htmlFor="isOpenStatus" className="text-xs font-bold text-gray-800 cursor-pointer">
              Store is currently Open
            </label>
          </div>

          {/* Store Description */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700">Store Description</label>
            <textarea
              rows={3}
              disabled={isViewOnly}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide information about the store..."
              className="w-full bg-white border border-gray-300 rounded-xl py-2.5 px-4 text-sm font-medium text-gray-900 focus:outline-none focus:border-[#3087C5] disabled:bg-gray-100 shadow-2xs resize-none"
            />
          </div>

          {/* Store Image Upload */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700">Store Photo</label>
            <div className="flex items-center space-x-4">
              <div className="w-24 h-24 rounded-2xl bg-gray-50 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
                {image ? (
                  <img src={image} alt="Store Preview" className="w-full h-full object-cover" />
                ) : (
                  <StoreIcon className="w-8 h-8 text-gray-400" />
                )}
              </div>
              {!isViewOnly && (
                <div className="flex-1">
                  <label className="inline-flex items-center space-x-2 px-4 py-2 rounded-full border border-gray-300 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 cursor-pointer shadow-2xs transition-colors">
                    <Upload className="w-4 h-4 text-[#3087C5]" />
                    <span>Upload Store Image</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                  <p className="text-[11px] text-gray-500 mt-1">PNG, JPG up to 5MB.</p>
                </div>
              )}
            </div>
          </div>

        </form>

        {/* Footer Actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
          <Button variant="outline" size="md" onClick={onClose} className="rounded-full px-5">
            {isViewOnly ? "Close" : "Cancel"}
          </Button>
          {!isViewOnly && (
            <Button form="store-form" variant="primary" size="md" type="submit" className="rounded-full px-6 shadow-md">
              <span>{mode === "create" ? "Save Store" : "Save Changes"}</span>
            </Button>
          )}
        </div>

      </div>
    </div>
  );
}