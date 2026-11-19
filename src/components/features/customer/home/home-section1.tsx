import { useState, useEffect, useRef } from "react";
import { Link } from "react-router";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";

const CATEGORIES = [
  {
    name: "Foods & Beverages",
    image: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=500&auto=format&fit=crop&q=80",
    path: "/products?category=foods",
  },
  {
    name: "Fashion & Apparel",
    image: "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=500&auto=format&fit=crop&q=80",
    path: "/products?category=fashion",
  },
  {
    name: "Electronics",
    image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=500&auto=format&fit=crop&q=80",
    path: "/products?category=electronics",
  },
  {
    name: "Beauty & Personal Care",
    image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=500&auto=format&fit=crop&q=80",
    path: "/products?category=beauty",
  },
  {
    name: "Home & Living",
    image: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=500&auto=format&fit=crop&q=80",
    path: "/products?category=home",
  },
  {
    name: "Health & Wellness",
    image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80",
    path: "/products?category=health",
  },
  {
    name: "Toys & Games",
    image: "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=500&auto=format&fit=crop&q=80",
    path: "/products?category=toys",
  },
  {
    name: "Others",
    image: "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=500&auto=format&fit=crop&q=80",
    path: "/products?category=others",
  },
];

export function HomeSection1() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto loop carousel timer (changes every 3.5 seconds)
  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % CATEGORIES.length);
    }, 3500);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [currentIndex]);

  const handlePrev = () => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? CATEGORIES.length - 1 : prevIndex - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % CATEGORIES.length);
  };

  return (
    <section className="bg-[#EBE9E1] w-full py-12 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Shop By Category
          </h2>
          <Link
            to="/products"
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
            aria-label="Previous category"
          >
            <ChevronLeft className="w-5 h-5 text-sky-700" />
          </button>

          {/* Right Arrow Button */}
          <button
            type="button"
            onClick={handleNext}
            className="absolute -right-3 sm:-right-5 top-1/2 -translate-y-1/2 z-20 bg-white/90 hover:bg-white text-gray-800 p-2 sm:p-2.5 rounded-full shadow-lg border border-gray-200 transition-all opacity-80 group-hover:opacity-100 hover:scale-105"
            aria-label="Next category"
          >
            <ChevronRight className="w-5 h-5 text-sky-700" />
          </button>

          {/* Responsive Grid / Slider View */}
          <div className="overflow-hidden py-2">
            <div 
              className="flex transition-transform duration-500 ease-out gap-4"
              style={{
                transform: `translateX(-${currentIndex * (100 / (window.innerWidth >= 1024 ? 5 : window.innerWidth >= 640 ? 3 : 2))}%)`
              }}
            >
              {CATEGORIES.map((cat) => (
                <div
                  key={cat.name}
                  className="w-1/2 sm:w-1/3 lg:w-1/5 shrink-0 px-1"
                >
                  <Link to={cat.path}>
                    <div className="bg-white border border-gray-200/80 hover:border-sky-500 rounded-2xl p-4 text-center shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col items-center justify-between h-48 group/card">
                      
                      {/* Category Image */}
                      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center p-2 mb-3">
                        <img
                          src={cat.image}
                          alt={cat.name}
                          className="w-full h-full object-cover rounded-lg group-hover/card:scale-110 transition-transform duration-500"
                        />
                      </div>

                      {/* Category Name */}
                      <p className="text-xs sm:text-sm font-bold text-gray-800 group-hover/card:text-sky-600 transition-colors line-clamp-2">
                        {cat.name}
                      </p>

                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Pagination Dots */}
        <div className="flex items-center justify-center space-x-2 mt-6">
          {CATEGORIES.map((_, idx) => (
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