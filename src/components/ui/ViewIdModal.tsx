import { X, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ViewIdModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountName: string;
  idOneUrl?: string;
  idTwoUrl?: string;
}

export function ViewIdModal({ isOpen, onClose, accountName, idOneUrl, idTwoUrl }: ViewIdModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#3087C5] text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-gray-900 text-base">Verification IDs</h3>
              <p className="text-xs font-bold text-[#3087C5]">{accountName}</p>
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
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* ID 1 */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-gray-700">Valid ID 1 (Front/Back)</span>
              <div className="h-48 rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center">
                <img 
                  src={idOneUrl || "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80"} 
                  alt="Valid ID 1" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* ID 2 */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-gray-700">Valid ID 2 (Front/Back)</span>
              <div className="h-48 rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center">
                <img 
                  src={idTwoUrl || "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&auto=format&fit=crop&q=80"} 
                  alt="Valid ID 2" 
                  className="w-full h-full object-cover"
                />
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