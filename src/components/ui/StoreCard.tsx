import { Link } from "react-router";
import { Clock, Phone, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

export type Store = {
  id: number;
  name: string;
  category: string;
  time: string;
  phone: string;
  isOpen: boolean;
  image: string;
  path: string;
};

type StoreCardProps = {
  store: Store;
};

export function StoreCard({ store }: StoreCardProps) {
  return (
    <div className="bg-white border border-gray-200/80 hover:border-[#3087C5] rounded-2xl p-4 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group/card">
      <div>
        {/* Store Image Box */}
        <Link to={store.path}>
          <div className="w-full h-40 rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center mb-3">
            <img
              src={store.image}
              alt={store.name}
              className="w-full h-full object-cover rounded-lg group-hover/card:scale-110 transition-transform duration-500"
            />
          </div>
        </Link>

        {/* Store Title */}
        <Link to={store.path}>
          <h3 className="font-bold text-gray-900 text-base sm:text-lg mb-2 line-clamp-1 hover:text-[#3087C5] transition-colors">
            {store.name}
          </h3>
        </Link>

        {/* Store Time & Number details */}
        <div className="space-y-1.5 mb-4 text-xs font-semibold text-gray-600">
          <div className="flex items-center space-x-2">
            <Clock className="w-3.5 h-3.5 text-[#3087C5] shrink-0" />
            <span>Open: {store.time}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Phone className="w-3.5 h-3.5 text-[#3087C5] shrink-0" />
            <span>{store.phone}</span>
          </div>
        </div>
      </div>

      {/* Action Controls */}
      <div className="space-y-2 pt-1">
        
        {/* Status Button (Gold if open, White if closed) */}
        <div>
          {store.isOpen ? (
            <Button variant="gold" size="sm" className="w-full justify-center py-2 text-xs font-black uppercase tracking-wider">
              Open
            </Button>
          ) : (
            <Button variant="white" size="sm" className="w-full justify-center py-2 text-xs font-black uppercase tracking-wider border border-gray-200 text-gray-500 bg-white hover:bg-gray-50">
              Close
            </Button>
          )}
        </div>

        {/* View Store Button */}
        <Link to={store.path} className="block w-full">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-center text-xs py-2 border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <Eye className="w-3.5 h-3.5 text-gray-500" />
            <span>View Store</span>
          </Button>
        </Link>

      </div>
    </div>
  );
}