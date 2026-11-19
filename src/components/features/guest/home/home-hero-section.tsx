import { useState, useEffect } from "react";
import { ShoppingCart, Store, MapPin } from "lucide-react";
import logoImage from "@/assets/logo.webp";
import bgImage from "@/assets/bg-img1.webp";

export function HomeHeroSection() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  const cardsData = [
    {
      icon: ShoppingCart,
      title: "Shop Online",
      subtitle: "Check Stock",
    },
    {
      icon: Store,
      title: "Explore Stores",
      subtitle: "& Services",
    },
    {
      icon: MapPin,
      title: "Pick Up at the Mall",
      subtitle: "Pay & Claim",
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
    <section className="relative min-h-[85vh] flex items-center overflow-hidden bg-gray-900 py-16 px-4 sm:px-8 lg:px-16">
      {/* Background Image with Fixed Parallax Effect & Dark Gradient Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-fixed z-0"
        style={{ backgroundImage: `url(${bgImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/40 backdrop-blur-[1px]" />
      </div>

      {/* Hero Content - Left Aligned matching reference */}
      <div className="relative z-10 max-w-7xl mx-w-full w-full text-white flex flex-col items-start justify-center space-y-6 pt-6">
        
        {/* Step 1: Logo & Title grouped on top left (First in sequence, slides up) */}
        <div 
          className={`flex items-center space-x-4 transition-all duration-1000 ease-out transform ${
            isLoaded ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
          }`}
        >
          <div className="bg-white/10 p-2.5 rounded-2xl backdrop-blur-md border border-white/20 shadow-inner">
            <img 
              src={logoImage} 
              alt="Online Mall Cordova Logo" 
              className="w-14 h-14 sm:w-18 sm:h-18 object-contain brightness-0 invert drop-shadow-[0_0_10px_rgba(255,255,255,0.6)]" 
            />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl sm:text-4xl font-black tracking-tight uppercase text-[#3087C5] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              Online Mall
            </span>
            <span className="text-xs sm:text-sm tracking-widest text-sky-400 font-bold uppercase drop-shadow">
              Cordova
            </span>
          </div>
        </div>

        {/* Step 2: Subtitles / Value Proposition (Second in sequence, 200ms delay, slides up) */}
        <div 
          className={`max-w-2xl space-y-2 transition-all duration-1000 delay-200 ease-out transform text-left ${
            isLoaded ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
          }`}
        >
          <p className="text-base sm:text-xl font-medium text-gray-100 leading-snug drop-shadow">
            Shop your favorite products, check stock, and explore all the stores inside the mall — all in one place.
          </p>
          <p className="text-sm sm:text-base font-semibold text-amber-300 tracking-wide drop-shadow">
            No more lines. Just order, pay at the mall, and claim!
          </p>
        </div>

        {/* Step 3: Info Cards (Auto-loop carousel on mobile, 3-column grid on desktop) */}
        <div 
          className={`w-full pt-4 max-w-4xl transition-all duration-1000 delay-400 ease-out transform ${
            isLoaded ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
          }`}
        >
          {/* Mobile Carousel View (Displays 1 card at a time with smooth fade) */}
          <div className="block sm:hidden relative w-full">
            <div className="bg-white text-gray-900 rounded-2xl p-4 shadow-xl border border-white/20 flex items-center space-x-3 text-left transition-all duration-500 transform">
              {(() => {
                const CurrentIcon = cardsData[activeCardIndex].icon;
                return (
                  <>
                    <div className="w-11 h-11 rounded-xl bg-[#3087C5] text-white flex items-center justify-center shrink-0 shadow">
                      <CurrentIcon className="w-5 h-5" />
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

          {/* Desktop Grid View (3 columns side-by-side) */}
          <div className="hidden sm:grid grid-cols-3 gap-4">
            {cardsData.map((card, index) => {
              const IconComponent = card.icon;
              return (
                <div 
                  key={index} 
                  className="bg-white text-gray-900 rounded-2xl p-4 shadow-xl border border-white/20 flex items-center space-x-3 text-left"
                >
                  <div className="w-11 h-11 rounded-xl bg-[#3087C5] text-white flex items-center justify-center shrink-0 shadow">
                    <IconComponent className="w-5 h-5" />
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