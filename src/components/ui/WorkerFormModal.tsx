import { useEffect, useState } from "react";
import { Calendar, HardHat, Lock, Mail, MapPin, Phone, Store, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getErrorMessage, getFieldErrors } from "@/lib/api";
import type { AdminAccountRow, AdminStore } from "@/lib/types";

export interface WorkerFormValues {
  name: string;
  email: string;
  phone: string;
  address: string;
  birthday: string;
  gender: string;
  password?: string;
  storeId: number | null;
}

interface WorkerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** `null` → create mode. */
  workerToEdit: AdminAccountRow | null;
  /** Stores available for assignment (from `GET /admin/stores`). */
  stores: AdminStore[];
  storesLoading?: boolean;
  /** Resolves on success (modal closes), rejects with `ApiError` on failure. */
  onSubmit: (values: WorkerFormValues) => Promise<void>;
}

const EMPTY_FORM: WorkerFormValues = {
  name: "",
  email: "",
  phone: "",
  address: "",
  birthday: "",
  gender: "Real Men",
  password: "",
  storeId: null,
};

const inputBase =
  "w-full bg-white border rounded-full py-2.5 pl-10 pr-4 text-xs sm:text-sm font-medium text-gray-900 focus:outline-none focus:border-[#3087C5]";

/** Inline field error rendered under a control. */
function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="pl-4 text-[11px] font-bold text-rose-600">{message}</p>;
}

export function WorkerFormModal({
  isOpen,
  onClose,
  workerToEdit,
  stores,
  storesLoading = false,
  onSubmit,
}: WorkerFormModalProps) {
  const [form, setForm] = useState<WorkerFormValues>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isEdit = workerToEdit !== null;

  useEffect(() => {
    if (!isOpen) return;
    setFieldErrors({});
    setFormError(null);
    setSubmitting(false);
    if (workerToEdit) {
      setForm({
        name: workerToEdit.name,
        email: workerToEdit.email,
        phone: workerToEdit.phone ?? "",
        address: workerToEdit.address ?? "",
        birthday: workerToEdit.birthday ?? "",
        gender: workerToEdit.gender ?? "Real Men",
        password: "",
        storeId: workerToEdit.storeId,
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [isOpen, workerToEdit]);

  if (!isOpen) return null;

  const set = <K extends keyof WorkerFormValues>(key: K, value: WorkerFormValues[K]) => {
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
    setFormError(null);

    const localErrors: Record<string, string> = {};
    if (!form.name.trim()) localErrors.name = "Full name is required.";
    if (!form.email.trim()) localErrors.email = "Email address is required.";
    if (!form.phone.trim()) localErrors.phone = "Phone number is required.";
    if (!isEdit && !(form.password ?? "").trim()) {
      localErrors.password = "A password is required when creating a worker.";
    }
    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        ...form,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        password: (form.password ?? "").trim() === "" ? undefined : form.password,
      });
      onClose();
    } catch (error) {
      const errors = getFieldErrors(error);
      setFieldErrors(errors);
      setFormError(
        Object.keys(errors).length > 0
          ? "Please fix the highlighted fields."
          : getErrorMessage(error),
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
      aria-label={isEdit ? "Edit worker account" : "Add new worker"}
    >
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#3087C5] text-white flex items-center justify-center shadow-xs">
              <HardHat className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-gray-900 text-base">
                {isEdit ? "Edit Worker Account" : "Add New Worker"}
              </h3>
              <p className="text-xs font-bold text-[#3087C5]">
                {isEdit && workerToEdit?.workerNo
                  ? `Worker ID: ${workerToEdit.workerNo}`
                  : "Mall Management"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close worker form"
            className="w-8 h-8 rounded-full bg-gray-200/80 hover:bg-gray-300 text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form id="worker-form" onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-3.5 flex-1">
          {formError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-800">
              {formError}
            </div>
          )}

          {/* Full Name */}
          <div className="space-y-1">
            <div className="relative">
              <User className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                required
                value={form.name}
                onChange={(event) => set("name", event.target.value)}
                placeholder="Full Name"
                aria-invalid={Boolean(fieldErrors.name)}
                className={`${inputBase} ${
                  fieldErrors.name ? "border-rose-400" : "border-gray-300"
                }`}
              />
            </div>
            <FieldError message={fieldErrors.name} />
          </div>

          {/* Email */}
          <div className="space-y-1">
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
              <input
                type="email"
                required
                value={form.email}
                onChange={(event) => set("email", event.target.value)}
                placeholder="Email Address"
                aria-invalid={Boolean(fieldErrors.email)}
                className={`${inputBase} ${
                  fieldErrors.email ? "border-rose-400" : "border-gray-300"
                }`}
              />
            </div>
            <FieldError message={fieldErrors.email} />
          </div>

          {/* Phone */}
          <div className="space-y-1">
            <div className="relative">
              <Phone className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
              <input
                type="tel"
                required
                value={form.phone}
                onChange={(event) => set("phone", event.target.value)}
                placeholder="Phone Number"
                aria-invalid={Boolean(fieldErrors.phone)}
                className={`${inputBase} ${
                  fieldErrors.phone ? "border-rose-400" : "border-gray-300"
                }`}
              />
            </div>
            <FieldError message={fieldErrors.phone} />
          </div>

          {/* Address */}
          <div className="space-y-1">
            <div className="relative">
              <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={form.address}
                onChange={(event) => set("address", event.target.value)}
                placeholder="Address"
                className={`${inputBase} ${
                  fieldErrors.address ? "border-rose-400" : "border-gray-300"
                }`}
              />
            </div>
            <FieldError message={fieldErrors.address} />
          </div>

          {/* Birthday & Gender Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="relative">
                <Calendar className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={form.birthday}
                  onChange={(event) => set("birthday", event.target.value)}
                  aria-label="Birthday"
                  className={`${inputBase} ${
                    fieldErrors.birthday ? "border-rose-400" : "border-gray-300"
                  }`}
                />
              </div>
              <FieldError message={fieldErrors.birthday} />
            </div>

            <div className="relative">
              <select
                value={form.gender}
                onChange={(event) => set("gender", event.target.value)}
                aria-label="Gender"
                className="w-full bg-white border border-gray-300 rounded-full py-2.5 px-4 text-xs sm:text-sm font-medium text-gray-900 focus:outline-none focus:border-[#3087C5] cursor-pointer"
              >
                <option value="Real Men">Real Men</option>
                <option value="Gender Neutral">Gender Neutral</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>

          {/* Store assignment */}
          <div className="space-y-1">
            <div className="relative">
              <Store className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
              <select
                value={form.storeId === null ? "" : String(form.storeId)}
                onChange={(event) =>
                  set("storeId", event.target.value === "" ? null : Number(event.target.value))
                }
                aria-label="Assigned store"
                disabled={storesLoading}
                className="w-full bg-white border border-gray-300 rounded-full py-2.5 pl-10 pr-4 text-xs sm:text-sm font-medium text-gray-900 focus:outline-none focus:border-[#3087C5] disabled:bg-gray-100 cursor-pointer"
              >
                <option value="">{storesLoading ? "Loading stores…" : "No store assigned"}</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </div>
            <FieldError message={fieldErrors.store_id} />
          </div>

          {/* Password */}
          <div className="space-y-1">
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
              <input
                type="password"
                required={!isEdit}
                value={form.password ?? ""}
                onChange={(event) => set("password", event.target.value)}
                placeholder={isEdit ? "New Password (leave blank to keep current)" : "Password"}
                aria-invalid={Boolean(fieldErrors.password)}
                className={`${inputBase} ${
                  fieldErrors.password ? "border-rose-400" : "border-gray-300"
                }`}
              />
            </div>
            <FieldError message={fieldErrors.password} />
            <p className="pl-4 text-[11px] font-medium text-gray-500">
              At least 12 characters with upper &amp; lower case letters and numbers.
            </p>
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
          <Button variant="outline" size="md" onClick={onClose} disabled={submitting} className="rounded-full px-5">
            Cancel
          </Button>
          <Button
            form="worker-form"
            variant="primary"
            size="md"
            type="submit"
            loading={submitting}
            className="rounded-full px-6"
          >
            <span>{isEdit ? "Save Changes" : "Create Worker"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
