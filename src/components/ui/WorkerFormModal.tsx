import { useState, useEffect } from "react";
import { X, HardHat, User, Mail, Phone, MapPin, Calendar, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WorkerAccount } from "@/pages/admin/AccountsDashboard";

interface WorkerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  workerToEdit: WorkerAccount | null;
  onSave: (workerData: Partial<WorkerAccount>) => void;
}

export function WorkerFormModal({ isOpen, onClose, workerToEdit, onSave }: WorkerFormModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    birthday: "",
    gender: "Real Men",
    password: "",
  });

  useEffect(() => {
    if (workerToEdit) {
      setFormData({
        name: workerToEdit.name,
        email: workerToEdit.email,
        phone: workerToEdit.phone,
        address: workerToEdit.address,
        birthday: workerToEdit.birthday,
        gender: workerToEdit.gender,
        password: workerToEdit.password || "",
      });
    } else {
      setFormData({
        name: "",
        email: "",
        phone: "",
        address: "",
        birthday: "",
        gender: "Real Men",
        password: "",
      });
    }
  }, [workerToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#3087C5] text-white flex items-center justify-center shadow-xs">
              <HardHat className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-gray-900 text-base">
                {workerToEdit ? "Edit Worker Account" : "Add New Worker"}
              </h3>
              <p className="text-xs font-bold text-[#3087C5]">Mall Management</p>
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
        <form id="worker-form" onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-3.5 flex-1">
          
          {/* Full Name */}
          <div className="relative">
            <User className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Full Name"
              className="w-full bg-white border border-gray-300 rounded-full py-2.5 pl-10 pr-4 text-xs sm:text-sm font-medium text-gray-900 focus:outline-none focus:border-[#3087C5]"
            />
          </div>

          {/* Email */}
          <div className="relative">
            <Mail className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Email Address"
              className="w-full bg-white border border-gray-300 rounded-full py-2.5 pl-10 pr-4 text-xs sm:text-sm font-medium text-gray-900 focus:outline-none focus:border-[#3087C5]"
            />
          </div>

          {/* Phone */}
          <div className="relative">
            <Phone className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Phone Number"
              className="w-full bg-white border border-gray-300 rounded-full py-2.5 pl-10 pr-4 text-xs sm:text-sm font-medium text-gray-900 focus:outline-none focus:border-[#3087C5]"
            />
          </div>

          {/* Address */}
          <div className="relative">
            <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              required
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Address"
              className="w-full bg-white border border-gray-300 rounded-full py-2.5 pl-10 pr-4 text-xs sm:text-sm font-medium text-gray-900 focus:outline-none focus:border-[#3087C5]"
            />
          </div>

          {/* Birthday & Gender Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <Calendar className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                required
                value={formData.birthday}
                onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                placeholder="Birthday mm/dd/yyyy"
                className="w-full bg-white border border-gray-300 rounded-full py-2.5 pl-10 pr-4 text-xs sm:text-sm font-medium text-gray-900 focus:outline-none focus:border-[#3087C5]"
              />
            </div>

            <div className="relative">
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full bg-white border border-gray-300 rounded-full py-2.5 px-4 text-xs sm:text-sm font-medium text-gray-900 focus:outline-none focus:border-[#3087C5]"
              >
                <option value="Real Men">Real Men</option>
                <option value="Gender Neutral">Gender Neutral</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>

          {/* Password */}
          <div className="relative">
            <Lock className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
            <input
              type="password"
              required={!workerToEdit}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder={workerToEdit ? "New Password (leave blank to keep current)" : "Password"}
              className="w-full bg-white border border-gray-300 rounded-full py-2.5 pl-10 pr-4 text-xs sm:text-sm font-medium text-gray-900 focus:outline-none focus:border-[#3087C5]"
            />
          </div>

        </form>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
          <Button variant="outline" size="md" onClick={onClose} className="rounded-full px-5">
            Cancel
          </Button>
          <Button form="worker-form" variant="primary" size="md" type="submit" className="rounded-full px-6">
            <span>{workerToEdit ? "Save Changes" : "Create Worker"}</span>
          </Button>
        </div>

      </div>
    </div>
  );
}