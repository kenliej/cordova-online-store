import { useEffect, useState } from "react";
import { Edit3, Eye, Plus, Store as StoreIcon, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getErrorMessage, getFieldErrors } from "@/lib/api";
import type { AdminStore, Category } from "@/lib/types";

/** Legacy alias kept for imports that used the modal's own store shape. */
export type StoreItem = AdminStore;

export interface StoreFormValues {
  name: string;
  categoryId: number | null;
  operatingHours: string;
  phone: string;
  isOpen: boolean;
  description: string;
  floorLocation: string;
  image: File | null;
}

interface AdminStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: AdminStore | null;
  mode: "create" | "update" | "view";
  categories: Category[];
  /** Resolves on success (modal closes), rejects with `ApiError` on failure. */
  onSubmit: (values: StoreFormValues) => Promise<void>;
}

const inputClass =
  "w-full bg-white border rounded-xl py-2.5 px-4 text-sm font-medium text-gray-900 focus:outline-none focus:border-[#3087C5] disabled:bg-gray-100 shadow-2xs";

const EMPTY_FORM: StoreFormValues = {
  name: "",
  categoryId: null,
  operatingHours: "6:00AM - 11:00PM",
  phone: "",
  isOpen: true,
  description: "",
  floorLocation: "",
  image: null,
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-[11px] font-bold text-rose-600">{message}</p>;
}

export function AdminStoreModal({
  isOpen,
  onClose,
  store,
  mode,
  categories,
  onSubmit,
}: AdminStoreModalProps) {
  const [form, setForm] = useState<StoreFormValues>(EMPTY_FORM);
  const [imagePreview, setImagePreview] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isViewOnly = mode === "view";

  useEffect(() => {
    if (!isOpen) return;
    setFieldErrors({});
    setFormError(null);
    setSubmitting(false);
    if (store && mode !== "create") {
      setForm({
        name: store.name,
        categoryId: store.categoryId,
        operatingHours: store.operatingHours || "6:00AM - 11:00PM",
        phone: store.phone || "",
        isOpen: store.isOpen,
        description: store.description || "",
        floorLocation: store.floorLocation || "",
        image: null,
      });
      setImagePreview(store.image || "");
    } else {
      setForm({ ...EMPTY_FORM, categoryId: categories[0]?.id ?? null });
      setImagePreview("");
    }
  }, [isOpen, store, mode]);

  // Default the category once the category list arrives in create mode.
  useEffect(() => {
    if (!isOpen || mode !== "create" || form.categoryId !== null) return;
    if (categories.length > 0) {
      setForm((current) => ({ ...current, categoryId: categories[0]?.id ?? null }));
    }
  }, [isOpen, mode, categories, form.categoryId]);

  // Revoke object URLs created for the local image preview.
  useEffect(() => {
    const file = form.image;
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [form.image]);

  if (!isOpen) return null;

  const set = <K extends keyof StoreFormValues>(key: K, value: StoreFormValues[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isViewOnly) {
      onClose();
      return;
    }

    setFormError(null);
    const localErrors: Record<string, string> = {};
    if (!form.name.trim()) localErrors.name = "Store name is required.";
    if (form.categoryId === null) localErrors.category_id = "Please choose a category.";
    if (!form.phone.trim()) localErrors.phone = "Contact number is required.";
    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        ...form,
        name: form.name.trim(),
        phone: form.phone.trim(),
        description: form.description.trim(),
        floorLocation: form.floorLocation.trim(),
        operatingHours: form.operatingHours.trim() || "6:00AM - 11:00PM",
      });
      onClose();
    } catch (caught) {
      const errors = getFieldErrors(caught);
      setFieldErrors(errors);
      setFormError(
        Object.keys(errors).length > 0
          ? "Please fix the highlighted fields."
          : getErrorMessage(caught),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans"
      role="dialog"
      aria-modal="true"
      aria-label={
        mode === "create" ? "Add new store" : mode === "update" ? "Update store" : "View store"
      }
    >
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#3087C5] text-white flex items-center justify-center shadow-xs">
              {mode === "create" ? (
                <Plus className="w-5 h-5" />
              ) : mode === "update" ? (
                <Edit3 className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="font-black text-gray-900 text-base">
                {mode === "create"
                  ? "Add New Store"
                  : mode === "update"
                    ? "Update Store Details"
                    : "View Store Information"}
              </h3>
              <p className="text-xs font-bold text-[#3087C5]">Mall Directory Management</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close store form"
            className="w-8 h-8 rounded-full bg-gray-200/80 hover:bg-gray-300 text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form id="store-form" onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {formError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-800">
              {formError}
            </div>
          )}

          {/* Store Name */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700">Store Name *</label>
            <input
              type="text"
              required
              disabled={isViewOnly}
              value={form.name}
              onChange={(event) => set("name", event.target.value)}
              placeholder="e.g. McDonald's"
              aria-invalid={Boolean(fieldErrors.name)}
              className={`${inputClass} ${
                fieldErrors.name ? "border-rose-400" : "border-gray-300"
              }`}
            />
            <FieldError message={fieldErrors.name} />
          </div>

          {/* Category Selection */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700">Category *</label>
            <select
              value={form.categoryId === null ? "" : String(form.categoryId)}
              disabled={isViewOnly}
              onChange={(event) =>
                set("categoryId", event.target.value === "" ? null : Number(event.target.value))
              }
              aria-invalid={Boolean(fieldErrors.category_id)}
              className={`w-full bg-white border rounded-xl py-2.5 px-4 text-sm font-medium text-gray-900 focus:outline-none focus:border-[#3087C5] disabled:bg-gray-100 shadow-2xs cursor-pointer ${
                fieldErrors.category_id ? "border-rose-400" : "border-gray-300"
              }`}
            >
              <option value="">Select a categoryâ€¦</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.displayName || category.name}
                </option>
              ))}
            </select>
            <FieldError message={fieldErrors.category_id} />
          </div>

          {/* Time & Phone Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Operating Hours *</label>
              <input
                type="text"
                disabled={isViewOnly}
                value={form.operatingHours}
                onChange={(event) => set("operatingHours", event.target.value)}
                placeholder="6:00AM - 11:00PM"
                className={`${inputClass} ${
                  fieldErrors.operating_hours ? "border-rose-400" : "border-gray-300"
                }`}
              />
              <FieldError message={fieldErrors.operating_hours} />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Contact Number *</label>
              <input
                type="text"
                required
                disabled={isViewOnly}
                value={form.phone}
                onChange={(event) => set("phone", event.target.value)}
                placeholder="0953967329"
                aria-invalid={Boolean(fieldErrors.phone)}
                className={`${inputClass} ${
                  fieldErrors.phone ? "border-rose-400" : "border-gray-300"
                }`}
              />
              <FieldError message={fieldErrors.phone} />
            </div>
          </div>

          {/* Mall floor / location */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700">Mall Floor / Location</label>
            <input
              type="text"
              disabled={isViewOnly}
              value={form.floorLocation}
              onChange={(event) => set("floorLocation", event.target.value)}
              placeholder="e.g. Ground Floor, near the main entrance"
              className={`${inputClass} ${
                fieldErrors.floor_location ? "border-rose-400" : "border-gray-300"
              }`}
            />
            <FieldError message={fieldErrors.floor_location} />
          </div>

          {/* Is Open Status Checkbox */}
          <div className="flex items-center space-x-3 pt-1">
            <input
              type="checkbox"
              id="isOpenStatus"
              disabled={isViewOnly}
              checked={form.isOpen}
              onChange={(event) => set("isOpen", event.target.checked)}
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
              value={form.description}
              onChange={(event) => set("description", event.target.value)}
              placeholder="Provide information about the store..."
              className={`w-full bg-white border rounded-xl py-2.5 px-4 text-sm font-medium text-gray-900 focus:outline-none focus:border-[#3087C5] disabled:bg-gray-100 shadow-2xs resize-none ${
                fieldErrors.description ? "border-rose-400" : "border-gray-300"
              }`}
            />
            <FieldError message={fieldErrors.description} />
          </div>

          {/* Store Image Upload */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700">Store Photo</label>
            <div className="flex items-center space-x-4">
              <div className="w-24 h-24 rounded-2xl bg-gray-50 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
                {imagePreview ? (
                  <img src={imagePreview} alt="Store preview" className="w-full h-full object-cover" />
                ) : (
                  <StoreIcon className="w-8 h-8 text-gray-400" />
                )}
              </div>
              {!isViewOnly && (
                <div className="flex-1">
                  <label className="inline-flex items-center space-x-2 px-4 py-2 rounded-full border border-gray-300 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 cursor-pointer shadow-2xs transition-colors">
                    <Upload className="w-4 h-4 text-[#3087C5]" />
                    <span>{form.image ? "Change Store Image" : "Upload Store Image"}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(event) => set("image", event.target.files?.[0] ?? null)}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[11px] text-gray-500 mt-1">JPG, PNG or WEBP up to 5MB.</p>
                  <FieldError message={fieldErrors.image} />
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
          <Button
            variant="outline"
            size="md"
            onClick={onClose}
            disabled={submitting}
            className="rounded-full px-5"
          >
            {isViewOnly ? "Close" : "Cancel"}
          </Button>
          {!isViewOnly && (
            <Button
              form="store-form"
              variant="primary"
              size="md"
              type="submit"
              loading={submitting}
              className="rounded-full px-6 shadow-md"
            >
              <span>{mode === "create" ? "Save Store" : "Save Changes"}</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
