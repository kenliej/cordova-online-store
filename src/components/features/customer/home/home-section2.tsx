import { useState, useEffect, useRef } from "react";
import { Link } from "react-router";
import { ChevronLeft, ChevronRight, ArrowRight, ShoppingCart, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const FEATURED_PRODUCTS = [
  {
    id: 1,
    name: "Wireless Earbuds",
    price: "₱ 1,299",
    status: "In Stock",
    image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&auto=format&fit=crop&q=80",
    path: "/products/wireless-earbuds",
  },
  {
    id: 2,
    name: "Sports Shoes",
    price: "₱ 1,899",
    status: "In Stock",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=80",
    path: "/products/sports-shoes",
  },
  {
    id: 3,
    name: "Laptop Backpack",
    price: "₱ 999",
    status: "In Stock",
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&auto=format&fit=crop&q=80",
    path: "/products/laptop-backpack",
  },
  {
    id: 4,
    name: "Skincare Set",
    price: "₱ 1,499",
    status: "In Stock",
    image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500&auto=format&fit=crop&q=80",
    path: "/products/skincare-set",
  },
  {
    id: 5,
    name: "Instant Noodles",
    price: "₱ 49",
    status: "In Stock",
    image: "https://images.unsplash.com/photo-1612929606404-7471ffae7a29?w=500&auto=format&fit=crop&q=80",
    path: "/products/instant-noodles",
  },
  {
    id: 6,
    name: "Smart Watch",
    price: "₱ 2,499",
    status: "In Stock",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=80",
    path: "/products/smart-watch",
  },
  {
    id: 7,
    name: "Stainless Tumbler",
    price: "₱ 450",
    status: "In Stock",
    image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500&auto=format&fit=crop&q=80",
    path: "/products/stainless-tumbler",
  },
  {
    id: 8,
    name: "Bluetooth Speaker",
    price: "₱ 899",
    status: "In Stock",
    image: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500&auto=format&fit=crop&q=80",
    path: "/products/bluetooth-speaker",
  },
];

export function HomeSection2() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto loop carousel timer (changes every 3.5 seconds)
  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % FEATURED_PRODUCTS.length);
    }, 3500);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [currentIndex]);

  const handlePrev = () => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? FEATURED_PRODUCTS.length - 1 : prevIndex - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % FEATURED_PRODUCTS.length);
  };

  return (
    <section className="max-w-7xl mx-auto py-12 px-4 sm:px-6">
      
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
          Featured Products
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
          aria-label="Previous product"
        >
          <ChevronLeft className="w-5 h-5 text-sky-700" />
        </button>

        {/* Right Arrow Button */}
        <button
          type="button"
          onClick={handleNext}
          className="absolute -right-3 sm:-right-5 top-1/2 -translate-y-1/2 z-20 bg-white/90 hover:bg-white text-gray-800 p-2 sm:p-2.5 rounded-full shadow-lg border border-gray-200 transition-all opacity-80 group-hover:opacity-100 hover:scale-105"
          aria-label="Next product"
        >
          <ChevronRight className="w-5 h-5 text-sky-700" />
        </button>

        {/* Responsive Grid / Slider View (Matched to Section 1 sizing) */}
        <div className="overflow-hidden py-2">
          <div 
            className="flex transition-transform duration-500 ease-out gap-4"
            style={{
              transform: `translateX(-${currentIndex * (100 / (window.innerWidth >= 1024 ? 5 : window.innerWidth >= 640 ? 3 : 2))}%)`
            }}
          >
            {FEATURED_PRODUCTS.map((prod) => (
              <div
                key={prod.id}
                className="w-1/2 sm:w-1/3 lg:w-1/5 shrink-0 px-1"
              >
                <div className="bg-white border border-gray-200 hover:border-sky-500 rounded-2xl p-4 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between h-auto min-h-[290px] group/card">
                  
                  <div>
                    {/* Product Image Box */}
                    <Link to={prod.path}>
                      <div className="w-full h-24 sm:h-28 rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center p-2 mb-3">
                        <img
                          src={prod.image}
                          alt={prod.name}
                          className="w-full h-full object-cover rounded-lg group-hover/card:scale-110 transition-transform duration-500"
                        />
                      </div>
                    </Link>

                    {/* Product Name */}
                    <Link to={prod.path}>
                      <h3 className="font-bold text-gray-800 text-xs sm:text-sm hover:text-sky-600 transition-colors line-clamp-1 mb-1">
                        {prod.name}
                      </h3>
                    </Link>

                    {/* Price */}
                    <p className="text-xs sm:text-sm font-black text-gray-900 mb-1">
                      {prod.price}
                    </p>

                    {/* Stock Status */}
                    <div className="flex items-center space-x-1 text-[11px] font-semibold text-emerald-600 mb-3">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{prod.status}</span>
                    </div>
                  </div>

                  {/* Add to Cart Button */}
                  <div className="pt-1">
                    <Button 
                      variant="primary" 
                      size="sm" 
                      className="w-full justify-center text-xs py-1.5"
                      onClick={() => alert(`Added ${prod.name} to cart!`)}
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>Add to Cart</span>
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
        {FEATURED_PRODUCTS.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setCurrentIndex(idx)}
            className={`h-2.5 rounded-full transition-all duration-300 ${
              currentIndex === idx ? "w-8 bg-[#3087C5]" : "w-2.5 bg-gray-300 hover:bg-gray-400"
            }`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>

    </section>
  );
}