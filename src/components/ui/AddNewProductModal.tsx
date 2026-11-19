import { EditProductModal } from "@/components/ui/EditProductModal";
import type { Category, WorkerProductPayload } from "@/lib/types";

interface AddNewProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Product categories from `GET /categories?type=product`. */
  categories: Category[];
  /** Resolves on success (modal closes), rejects with `ApiError` on failure. */
  onSubmit: (payload: WorkerProductPayload) => Promise<void>;
}

/**
 * Thin create-mode wrapper around `EditProductModal` (kept for compatibility —
 * the worker inventory page opens `EditProductModal` with `mode="create"`).
 */
export function AddNewProductModal({
  isOpen,
  onClose,
  categories,
  onSubmit,
}: AddNewProductModalProps) {
  return (
    <EditProductModal
      isOpen={isOpen}
      onClose={onClose}
      product={null}
      mode="create"
      categories={categories}
      onSubmit={onSubmit}
    />
  );
}
