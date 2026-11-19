import { X, User, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CustomerAccount } from "@/pages/admin/AccountsDashboard";

interface CustomerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerAccount | null;
}

export function CustomerDetailsModal({ isOpen, onClose, customer }: CustomerDetailsModalProps) {
  if (!isOpen || !customer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#3087C5] text-white flex items-center justify-center shadow-xs">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-gray-900 text-base">Customer Details</h3>
              <p className="text-xs font-bold text-[#3087C5]">ID: {customer.customerId}</p>
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
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* User Profile Summary */}
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-5 bg-gray-50 p-4 rounded-2xl border border-gray-200">
            <div className="w-24 h-24 rounded-2xl bg-white overflow-hidden border border-gray-200 shrink-0">
              <img src={customer.profileImage} alt={customer.name} className="w-full h-full object-cover" />
            </div>
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="font-black text-gray-900 text-lg">{customer.name}</h4>
              <p className="text-xs font-semibold text-gray-600">Email: <span className="text-gray-900">{customer.email}</span></p>
              <p className="text-xs font-semibold text-gray-600">Phone: <span className="text-gray-900">{customer.phone}</span></p>
              <p className="text-xs font-semibold text-gray-600">Address: <span className="text-gray-900">{customer.address}</span></p>
              <div className="pt-1 flex items-center justify-center sm:justify-start space-x-2">
                <span className="text-xs font-bold text-gray-500">Gender: {customer.gender}</span>
                <span className="text-gray-300">•</span>
                <span className="text-xs font-bold text-gray-500">Birthday: {customer.birthday}</span>
              </div>
            </div>
          </div>

          {/* Bad Records Counter (Limit 2) */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <div>
                <h5 className="text-xs font-black text-amber-900 uppercase">Didn't Claimed Records</h5>
                <p className="text-xs text-amber-700 font-semibold">2 unclaimed orders will cause automatic account ban.</p>
              </div>
            </div>
            <span className={`text-base font-black px-3 py-1 rounded-full ${
              customer.badRecords >= 2 ? "bg-red-600 text-white" : "bg-amber-200 text-amber-900"
            }`}>
              {customer.badRecords}/2
            </span>
          </div>

          {/* Uploaded Verification IDs */}
          <div className="space-y-2">
            <h5 className="text-xs font-black uppercase text-gray-500 tracking-wider">Verification IDs</h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="h-40 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
                <img src={customer.idOneUrl || "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80"} alt="ID 1" className="w-full h-full object-cover" />
              </div>
              <div className="h-40 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
                <img src={customer.idTwoUrl || "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&auto=format&fit=crop&q=80"} alt="ID 2" className="w-full h-full object-cover" />
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