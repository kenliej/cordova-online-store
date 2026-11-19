import { useEffect, useState } from "react";
import { Edit3, Eye, Image as ImageIcon, Plus, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getErrorMessage, getFieldErrors } from "@/lib/api";
import { formatPeso } from "@/lib/format";
import type { Category, WorkerProduct, WorkerProductPayload } from "@/lib/types";

/** Re-exported so cards/pages can keep importing `WorkerProduct` from here. */
export type { WorkerProduct };

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Existing product for `update`/`view`; `null` in `create` mode. */
  product: WorkerProduct | null;
  mode: "create" | "update" | "view";
  categories: Category[];
  /** Resolves on success (modal closes), rejects with `ApiError` on failure. */
  onSubmit: (payload: WorkerProductPayload) => Promise<void>;
}

const MAX_IMAGES = 3;

const inputClass =
  "w-full bg-white border rounded-xl py-2.5 px-4 text-sm font-medium text-gray-900 focus:outline-none focus:border-[#3087C5] disabled:bg-gray-100 disabled:text-gray-600 shadow-2xs";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-[11px] font-bold text-rose-600">{message}</p>;
}

function imageError(fieldErrors: Record<string, string>): string | undefined {
  return (
    fieldErrors.images ??
    Object.entries(fieldErrors).find(([key]) => key.startsWith("images."))?.[1]
  );
}

export function EditProductModal({
  isOpen,
  onClose,
  product,
  mode,
  categories,
  onSubmit,
}: EditProductModalProps) {
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<string>("");
  const [stock, setStock] = useState<string>("");
  const [isNew, setIsNew] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  /** Ids of saved images the worker chose to delete on save. */
  const [removedImageIds, setRemovedImageIds] = useState<number[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isViewOnly = mode === "view";
  const isCreate = mode === "create";

  useEffect(() => {
    if (!isOpen) return;
    setFieldErrors({});
    setFormError(null);
    setSubmitting(false);
    setFiles([]);
    setRemovedImageIds([]);
    if (product && mode !== "create") {
      setName(product.name);
      setCategoryId(product.categoryId);
      setDescription(product.description || "");
      setPrice(String(product.price));
      setStock(String(product.stock));
      setIsNew(product.isNew);
    } else {
      setName("");
      setCategoryId(categories[0]?.id ?? null);
      setDescription("");
      setPrice("");
      setStock("");
      setIsNew(false);
    }
  }, [isOpen, product, mode]);

  // Default the category once the category list arrives in create mode.
  useEffect(() => {
    if (isOpen && isCreate && categoryId === null && categories.length > 0) {
      setCategoryId(categories[0]?.id ?? null);
    }
  }, [isOpen, isCreate, categoryId, categories]);

  // Local previews for the selected files.
  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, [files]);

  if (!isOpen) return null;

  // Prefer server image ids; fall back to URL-only payloads for older records.
  const savedImages = (product?.imageRecords?.length
    ? product.imageRecords
    : (product?.images ?? []).map((url) => ({ id: 0, url }))
  ).filter((image) => !removedImageIds.includes(image.id));
  const existingImageUrls = savedImages.map((image) => image.url);
  const totalImages = existingImageUrls.length + files.length;

  /** Clears the server-side error for a field once the user edits it. */
  const clearError = (key: string) => {
    setFieldErrors((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const handleFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const selected = Array.from(incoming);
    if (totalImages + selected.length > MAX_IMAGES) {
      setFormError(`You can upload a maximum of ${MAX_IMAGES} images.`);
      return;
    }
    setFormError(null);
    setFiles((current) => [...current, ...selected].slice(0, MAX_IMAGES - existingImageUrls.length));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isViewOnly) {
      onClose();
      return;
    }

    setFormError(null);
    const localErrors: Record<string, string> = {};
    if (!name.trim()) localErrors.name = "Product name is required.";
    if (categoryId === null) localErrors.category_id = "Please choose a category.";
    if (price === "" || Number.isNaN(Number(price)) || Number(price) < 0) {
      localErrors.price = "Enter a valid price.";
    }
    if (stock === "" || Number.isNaN(Number(stock)) || Number(stock) < 0) {
      localErrors.stock = "Enter a valid stock count.";
    }
    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        categoryId,
        description: description.trim(),
        price: Number(price),
        stock: Number(stock),
        isNew,
        images: files.length > 0 ? files : undefined,
        removeImageIds: removedImageIds.length > 0 ? removedImageIds : undefined,
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

  const headerTitle = isCreate
    ? "Add New Product"
    : isViewOnly
      ? "View Product Details"
      : "Update Product";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans"
      role="dialog"
      aria-modal="true"
      aria-label={headerTitle}
    >
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#3087C5] text-white flex items-center justify-center shadow-xs">
              {isCreate ? (
                <Plus className="w-5 h-5" />
              ) : isViewOnly ? (
                <Eye className="w-5 h-5" />
              ) : (
                <Edit3 className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="font-black text-gray-900 text-base">{headerTitle}</h3>
              <p className="text-xs font-bold text-[#3087C5]">
                {product && !isCreate ? `Product ID: #${product.id}` : "Inventory Management"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close product form"
            className="w-8 h-8 rounded-full bg-gray-200/80 hover:bg-gray-300 text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form id="product-form" onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {formError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-800">
              {formError}
            </div>
          )}

          {/* Product Name */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700">Product Name *</label>
            <input
              type="text"
              required
              disabled={isViewOnly}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                clearError("name");
              }}
              placeholder="e.g. Wireless Earbuds"
              aria-invalid={Boolean(fieldErrors.name)}
              className={`${inputClass} ${fieldErrors.name ? "border-rose-400" : "border-gray-300"}`}
            />
            <FieldError message={fieldErrors.name} />
          </div>

          {/* Category Selection */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700">Category *</label>
            <select
              value={categoryId === null ? "" : String(categoryId)}
              disabled={isViewOnly}
              onChange={(event) => {
                setCategoryId(event.target.value === "" ? null : Number(event.target.value));
                clearError("category_id");
              }}
              aria-invalid={Boolean(fieldErrors.category_id)}
              className={`w-full bg-white border rounded-xl py-2.5 px-4 text-sm font-medium text-gray-900 focus:outline-none focus:border-[#3087C5] disabled:bg-gray-100 disabled:text-gray-600 shadow-2xs cursor-pointer ${
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

          {/* Price & Stocks Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Product Price (â‚±) *</label>
              <input
                type="number"
                min="0"
                step="any"
                required
                disabled={isViewOnly}
                value={price}
                onChange={(event) => {
                  setPrice(event.target.value);
                  clearError("price");
                }}
                aria-invalid={Boolean(fieldErrors.price)}
                className={`${inputClass} ${fieldErrors.price ? "border-rose-400" : "border-gray-300"}`}
              />
              <FieldError message={fieldErrors.price} />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Stocks Available *</label>
              <input
                type="number"
                min="0"
                step="1"
                required
                disabled={isViewOnly}
                value={stock}
                onChange={(event) => {
                  setStock(event.target.value);
                  clearError("stock");
                }}
                aria-invalid={Boolean(fieldErrors.stock)}
                className={`${inputClass} ${fieldErrors.stock ? "border-rose-400" : "border-gray-300"}`}
              />
              <FieldError message={fieldErrors.stock} />
            </div>
          </div>

          {/* New arrival flag */}
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="product-is-new"
              disabled={isViewOnly}
              checked={isNew}
              onChange={(event) => setIsNew(event.target.checked)}
              className="w-4 h-4 text-[#3087C5] rounded border-gray-300 focus:ring-[#3087C5]"
            />
            <label htmlFor="product-is-new" className="text-xs font-bold text-gray-800 cursor-pointer">
              Mark as New Arrival
            </label>
          </div>

          {/* Product Description */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700">Product Description</label>
            <textarea
              rows={3}
              disabled={isViewOnly}
              value={description}
              onChange={(event) => {
                setDescription(event.target.value);
                clearError("description");
              }}
              placeholder="Provide details about the item..."
              className={`w-full bg-white border rounded-xl py-2.5 px-4 text-sm font-medium text-gray-900 focus:outline-none focus:border-[#3087C5] disabled:bg-gray-100 disabled:text-gray-600 shadow-2xs resize-none ${
                fieldErrors.description ? "border-rose-400" : "border-gray-300"
              }`}
            />
            <FieldError message={fieldErrors.description} />
          </div>

          {/* Images (max 3) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-700">Product Images (Max 3)</label>
              <span className="text-[11px] font-semibold text-gray-500">{totalImages}/3 uploaded</span>
            </div>

            {isViewOnly ? (
              <div className="grid grid-cols-3 gap-3">
                {existingImageUrls.map((url, index) => (
                  <div
                    key={`${url}-${index}`}
                    className="relative h-24 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden"
                  >
                    <img src={url} alt={`Product ${index + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
                {existingImageUrls.length === 0 && (
                  <div className="col-span-3 h-24 rounded-xl border border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center gap-1 text-gray-400">
                    <ImageIcon className="w-6 h-6" />
                    <span className="text-[11px] font-bold">No images uploaded</span>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3">
                  {savedImages.map((image, index) => (
                    <div
                      key={`${image.url}-${image.id}-${index}`}
                      className="relative h-24 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden group"
                    >
                      <img src={image.url} alt={`Existing product ${index + 1}`} className="w-full h-full object-cover" />
                      <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                        Saved
                      </span>
                      {image.id > 0 && (
                        <button
                          type="button"
                          onClick={() => setRemovedImageIds((current) => [...current, image.id])}
                          aria-label="Remove saved image"
                          className="absolute top-1.5 right-1.5 bg-red-600 text-white p-1 rounded-full opacity-90 hover:opacity-100 shadow-sm transition-opacity cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}

                  {files.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="relative h-24 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden group"
                    >
                      {previews[index] && (
                        <img src={previews[index]} alt={`New preview ${index + 1}`} className="w-full h-full object-cover" />
                      )}
                      <button
                        type="button"
                        onClick={() => setFiles((current) => current.filter((_, position) => position !== index))}
                        aria-label="Remove selected image"
                        className="absolute top-1.5 right-1.5 bg-red-600 text-white p-1 rounded-full opacity-90 hover:opacity-100 shadow-sm transition-opacity cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {totalImages < MAX_IMAGES && (
                    <label className="h-24 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 flex flex-col items-center justify-center cursor-pointer transition-colors">
                      <Upload className="w-5 h-5 text-[#3087C5] mb-1" />
                      <span className="text-[10px] font-bold text-gray-600">Upload Image</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        onChange={(event) => {
                          handleFiles(event.target.files);
                          event.target.value = "";
                        }}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
                {totalImages === MAX_IMAGES && files.length === 0 && existingImageUrls.length > 0 && (
                  <p className="text-[11px] font-medium text-gray-500">
                    This product already has the maximum of 3 images.
                  </p>
                )}
              </>
            )}
            <FieldError message={imageError(fieldErrors)} />
          </div>
        </form>

        {/* Footer Actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3">
          {isViewOnly ? (
            <span className="text-xs font-bold text-gray-500">
              Stock:{" "}
              <span className={product && product.stock === 0 ? "text-red-600" : "text-emerald-600"}>
                {product?.stock ?? 0}
              </span>
              {product && ` Â· ${formatPeso(product.price)}`}
            </span>
          ) : (
            <span />
          )}
          <div className="flex items-center space-x-3">
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
                form="product-form"
                variant="primary"
                size="md"
                type="submit"
                loading={submitting}
                className="rounded-full px-6 shadow-md"
              >
                <span>{isCreate ? "Save Product" : "Save Changes"}</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
