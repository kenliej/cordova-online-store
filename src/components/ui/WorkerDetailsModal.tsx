import { X, HardHat, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { WorkerAccount } from "@/pages/admin/AccountsDashboard";

interface WorkerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  worker: WorkerAccount | null;
}

export function WorkerDetailsModal({ isOpen, onClose, worker }: WorkerDetailsModalProps) {
  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen || !worker) return null;

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
              <h3 className="font-black text-gray-900 text-base">Worker Account Details</h3>
              <p className="text-xs font-bold text-[#3087C5]">Worker ID: {worker.workerId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-200/80 hover:bg-gray-300 text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          
          <div className="flex items-center space-x-4 bg-gray-50 p-4 rounded-2xl border border-gray-200">
            <div className="w-20 h-20 rounded-2xl bg-white overflow-hidden border border-gray-200 shrink-0">
              <img src={worker.profileImage} alt={worker.name} className="w-full h-full object-cover" />
            </div>
            <div>
              <h4 className="font-black text-gray-900 text-base">{worker.name}</h4>
              <p className="text-xs font-semibold text-gray-500">Birthday: {worker.birthday}</p>
              <p className="text-xs font-semibold text-gray-500">Gender: {worker.gender}</p>
            </div>
          </div>

          <div className="space-y-3 text-xs font-semibold text-gray-700">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Email Address</span>
              <span className="font-bold text-gray-900">{worker.email}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Phone Number</span>
              <span className="font-bold text-gray-900">{worker.phone}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Address</span>
              <span className="font-bold text-gray-900">{worker.address}</span>
            </div>

            {/* Password Reveal for Admin */}
            <div className="flex justify-between items-center py-2 bg-sky-50 px-3 rounded-xl border border-sky-100">
              <span className="text-sky-800 font-bold">Account Password</span>
              <div className="flex items-center space-x-2">
                <span className="font-black text-gray-900">
                  {showPassword ? worker.password : "••••••••••••"}
                </span>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-sky-600 hover:text-sky-800 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <Button variant="primary" size="md" onClick={onClose} className="rounded-full px-6">
            Close
          </Button>
        </div>

      </div>
    </div>
  );
}