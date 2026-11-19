import { useState, useEffect, useRef } from "react";
import { Link } from "react-router";
import { ChevronLeft, ChevronRight, ArrowRight, Clock, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORES = [
  {
    id: 1,
    name: "McDonald's",
    hours: "Open: 6:00AM - 11:00PM",
    phone: "0953967329",
    status: "Open",
    image: "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=500&auto=format&fit=crop&q=80",
    path: "/stores/mcdonalds",
  },
  {
    id: 2,
    name: "Mang Inasal",
    hours: "Open: 6:00AM - 11:00PM",
    phone: "0953967329",
    status: "Close",
    image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&auto=format&fit=crop&q=80",
    path: "/stores/mang-inasal",
  },
  {
    id: 3,
    name: "Hair Salon",
    hours: "Open: 6:00AM - 11:00PM",
    phone: "0953967329",
    status: "Open",
    image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=500&auto=format&fit=crop&q=80",
    path: "/stores/hair-salon",
  },
  {
    id: 4,
    name: "Cebuana",
    hours: "Open: 6:00AM - 11:00PM",
    phone: "0953967329",
    status: "Open",
    image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=500&auto=format&fit=crop&q=80",
    path: "/stores/cebuana",
  },
  {
    id: 5,
    name: "Watson's Pharmacy",
    hours: "Open: 8:00AM - 9:00PM",
    phone: "0953967330",
    status: "Open",
    image: "https://images.unsplash.com/photo-1576602976047-174e57a47881?w=500&auto=format&fit=crop&q=80",
    path: "/stores/watsons",
  },
  {
    id: 6,
    name: "Supermarket",
    hours: "Open: 6:00AM - 10:00PM",
    phone: "0953967331",
    status: "Open",
    image: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=500&auto=format&fit=crop&q=80",
    path: "/stores/supermarket",
  },
  {
    id: 7,
    name: "Department Store",
    hours: "Open: 9:00AM - 9:00PM",
    phone: "0953967332",
    status: "Open",
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=500&auto=format&fit=crop&q=80",
    path: "/stores/department-store",
  },
  {
    id: 8,
    name: "Coffee Shop",
    hours: "Open: 7:00AM - 11:00PM",
    phone: "0953967333",
    status: "Open",
    image: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=500&auto=format&fit=crop&q=80",
    path: "/stores/coffee-shop",
  },
];

export function HomeSection3() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto loop carousel timer (changes every 3.5 seconds)
  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % STORES.length);
    }, 3500);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [currentIndex]);

  const handlePrev = () => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? STORES.length - 1 : prevIndex - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % STORES.length);
  };

  return (
    <section className="bg-[#EBE9E1] w-full py-12 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Stores in the Mall
          </h2>
          <Link
            to="/stores"
            className="flex items-center space-x-1 text-sm font-bold text-sky-600 hover:text-sky-700 transition-colors group"
          >
            <span>View All</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Carousel Container */}
        <div className="relative group">
          
          {/* Left Arrow Button */}
          <button
            type="button"
            onClick={handlePrev}
            className="absolute -left-3 sm:-left-5 top-1/2 -translate-y-1/2 z-20 bg-white/90 hover:bg-white text-gray-800 p-2 sm:p-2.5 rounded-full shadow-lg border border-gray-200 transition-all opacity-80 group-hover:opacity-100 hover:scale-105"
            aria-label="Previous store"
          >
            <ChevronLeft className="w-5 h-5 text-sky-700" />
          </button>

          {/* Right Arrow Button */}
          <button
            type="button"
            onClick={handleNext}
            className="absolute -right-3 sm:-right-5 top-1/2 -translate-y-1/2 z-20 bg-white/90 hover:bg-white text-gray-800 p-2 sm:p-2.5 rounded-full shadow-lg border border-gray-200 transition-all opacity-80 group-hover:opacity-100 hover:scale-105"
            aria-label="Next store"
          >
            <ChevronRight className="w-5 h-5 text-sky-700" />
          </button>

          {/* Responsive Grid / Slider View */}
          <div className="overflow-hidden py-2">
            <div 
              className="flex transition-transform duration-500 ease-out gap-4"
              style={{
                transform: `translateX(-${currentIndex * (100 / (window.innerWidth >= 1024 ? 4 : window.innerWidth >= 640 ? 2 : 1))}%)`
              }}
            >
              {STORES.map((store) => (
                <div
                  key={store.id}
                  className="w-full sm:w-1/2 lg:w-1/4 shrink-0 px-1"
                >
                  <div className="bg-white border border-gray-200/80 hover:border-sky-500 rounded-2xl p-4 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between h-auto min-h-[320px] group/card">
                    
                    <div>
                      {/* Store Image Box */}
                      <Link to={store.path}>
                        <div className="w-full h-32 sm:h-36 rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center mb-3">
                          <img
                            src={store.image}
                            alt={store.name}
                            className="w-full h-full object-cover rounded-xl group-hover/card:scale-110 transition-transform duration-500"
                          />
                        </div>
                      </Link>

                      {/* Store Name */}
                      <Link to={store.path}>
                        <h3 className="font-bold text-gray-900 text-base sm:text-lg hover:text-sky-600 transition-colors line-clamp-1 mb-2">
                          {store.name}
                        </h3>
                      </Link>

                      {/* Operating Hours */}
                      <div className="flex items-center space-x-1.5 text-xs text-gray-700 mb-1.5">
                        <Clock className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                        <span className="truncate">{store.hours}</span>
                      </div>

                      {/* Contact Phone */}
                      <div className="flex items-center space-x-1.5 text-xs text-gray-700 mb-4">
                        <Phone className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                        <span>{store.phone}</span>
                      </div>
                    </div>

                    {/* Open/Close Status Button (White if closed, Gold if open) */}
                    <div className="pt-1">
                      <Button 
                        variant={store.status === "Close" ? "white" : "gold"} 
                        size="md" 
                        className={`w-full justify-center text-sm font-bold shadow-sm ${
                          store.status === "Close" ? "border border-gray-200 text-gray-500 hover:bg-gray-50" : ""
                        }`}
                      >
                        {store.status}
                      </Button>
                    </div>

                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Pagination Dots */}
        <div className="flex items-center justify-center space-x-2 mt-6">
          {STORES.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                currentIndex === idx ? "w-8 bg-[#3087C5]" : "w-2.5 bg-gray-400/60 hover:bg-gray-500"
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>

      </div>
    </section>
  );
}