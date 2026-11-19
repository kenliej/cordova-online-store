import { useState, useEffect } from "react";
import { ShoppingCart, Store, ShieldCheck, PackageCheck } from "lucide-react";
import bgImage from "@/assets/bg-img1.webp";

export function StoresHeroSection() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  const cardsData = [
    {
      icon: ShoppingCart,
      title: "Shop Online",
      subtitle: "Check stock & order easily",
    },
    {
      icon: Store,
      title: "Mall Pickup",
      subtitle: "Pay and claim at the mall",
    },
    {
      icon: ShieldCheck,
      title: "Secure Shopping",
      subtitle: "Your data is safe with us",
    },
    {
      icon: PackageCheck,
      title: "Mall Pickup",
      subtitle: "New products & restocks",
    },
  ];

  useEffect(() => {
    // Trigger sequenced upward animation entrance on mount
    const timer = setTimeout(() => setIsLoaded(true), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Auto loop carousel timer for mobile view (every 3 seconds)
    const interval = setInterval(() => {
      setActiveCardIndex((prevIndex) => (prevIndex + 1) % cardsData.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [cardsData.length]);

  return (
    <section className="relative min-h-[60vh] sm:min-h-[70vh] flex items-center overflow-hidden bg-gray-900 py-12 px-4 sm:px-8 lg:px-16">
      {/* Background Image with Fixed Parallax Effect & Soft Gradient Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-fixed z-0"
        style={{ backgroundImage: `url(${bgImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/30 backdrop-blur-[1px]" />
      </div>

      {/* Hero Content - Left Aligned matching reference layout */}
      <div className="relative z-10 max-w-7xl mx-auto w-full text-white flex flex-col items-start justify-center space-y-6 pt-4">
        
        {/* Step 1: Page Title "Mall Stores" */}
        <div 
          className={`transition-all duration-1000 ease-out transform ${
            isLoaded ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
          }`}
        >
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#3087C5] drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
            Mall Stores
          </h1>
        </div>

        {/* Step 2: Subtitle Description */}
        <div 
          className={`max-w-2xl transition-all duration-1000 delay-200 ease-out transform text-left ${
            isLoaded ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
          }`}
        >
          <p className="text-lg sm:text-2xl font-bold text-white leading-snug drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
            Browse a wide selection of products from your favorite stores, all in one place.
          </p>
        </div>

        {/* Step 3: Info Cards (Auto-loop carousel on mobile, 4-column grid on desktop) */}
        <div 
          className={`w-full pt-4 max-w-6xl transition-all duration-1000 delay-400 ease-out transform ${
            isLoaded ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
          }`}
        >
          
          {/* Mobile Carousel View (Displays 1 card at a time with smooth auto-loop) */}
          <div className="block sm:hidden relative w-full">
            <div className="bg-white text-gray-900 rounded-2xl p-4 shadow-xl border border-white/20 flex items-center space-x-3 text-left transition-all duration-500">
              {(() => {
                const CurrentIcon = cardsData[activeCardIndex].icon;
                return (
                  <>
                    <div className="w-12 h-12 rounded-xl bg-[#3087C5] text-white flex items-center justify-center shrink-0 shadow">
                      <CurrentIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm leading-tight">
                        {cardsData[activeCardIndex].title}
                      </h3>
                      <p className="text-xs text-gray-600 font-medium">
                        {cardsData[activeCardIndex].subtitle}
                      </p>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Carousel Dot Indicators */}
            <div className="flex justify-center space-x-1.5 mt-3">
              {cardsData.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveCardIndex(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    activeCardIndex === idx ? "w-6 bg-[#3087C5]" : "w-1.5 bg-white/40"
                  }`}
                  aria-label={`Go to card ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Desktop & Tablet Grid View (4 columns side-by-side) */}
          <div className="hidden sm:grid grid-cols-2 lg:grid-cols-4 gap-4">
            {cardsData.map((card, index) => {
              const IconComponent = card.icon;
              return (
                <div 
                  key={index} 
                  className="bg-white text-gray-900 rounded-2xl p-4 shadow-xl border border-white/20 flex items-center space-x-3 text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#3087C5] text-white flex items-center justify-center shrink-0 shadow">
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm sm:text-base leading-tight">
                      {card.title}
                    </h3>
                    <p className="text-xs text-gray-600 font-medium">
                      {card.subtitle}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

      </div>
    </section>
  );
}