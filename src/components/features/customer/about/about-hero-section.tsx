import { Target, Eye, Gem } from "lucide-react";
import bgImage from "@/assets/bg-img1.webp";

export function AboutHeroSection() {
  const cardsData = [
    {
      icon: Target,
      title: "Our Mission",
      description:
        "To Provide a convenient, Secure, and user-friendly online mall experience that connects customers with the products, stores, and services they seek -- anytime, anywhere, and with ease.",
    },
    {
      icon: Eye,
      title: "Our Vision",
      description:
        "To become the most trusted and innovative online mall platform, bridging the gap between customers, stores, and the community, while promoting a smarter and more connected shopping experience.",
    },
    {
      icon: Gem,
      title: "Our Values",
      description:
        "Committed to excellence, transparency, and continuous innovation. We prioritize customer satisfaction, supporting local store partners, and delivering seamless digital services.",
    },
  ];

  return (
    <section className="relative min-h-[60vh] sm:min-h-[70vh] flex flex-col justify-between overflow-hidden bg-gray-900 pt-12 pb-16 px-4 sm:px-8 lg:px-16">
      {/* Background Image with Parallax & Soft Dark Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-fixed z-0"
        style={{ backgroundImage: `url(${bgImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/30 backdrop-blur-[1px]" />
      </div>

      {/* Hero Content - Top Section */}
      <div className="relative z-10 max-w-7xl mx-auto w-full text-white flex flex-col items-start justify-center space-y-4 pt-4">
        
        {/* Title */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#3087C5] drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
          About Us
        </h1>

        {/* Subtitle Lines */}
        <div className="max-w-3xl text-left">
          <p className="text-lg sm:text-2xl font-bold text-white leading-snug drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
            More than just an online store,
          </p>
          <p className="text-lg sm:text-2xl font-bold text-white leading-snug drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
            We’re your connection to a smarter,
          </p>
          <p className="text-lg sm:text-2xl font-bold text-white leading-snug drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
            easier, and more convenient mall experience.
          </p>
        </div>

      </div>

      {/* Bottom Floating Cards Grid */}
      <div className="relative z-10 max-w-7xl mx-auto w-full pt-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cardsData.map((card, index) => {
            const IconComponent = card.icon;
            return (
              <div
                key={index}
                className="bg-white text-gray-900 rounded-3xl p-6 sm:p-7 shadow-2xl border border-white/20 flex flex-col items-start space-y-3 transition-transform duration-300 hover:-translate-y-1"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-sky-50 text-[#3087C5] flex items-center justify-center shrink-0 shadow-xs border border-sky-100">
                    <IconComponent className="w-7 h-7" />
                  </div>
                  <h3 className="font-black text-gray-900 text-xl sm:text-2xl">
                    {card.title}
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed pt-1">
                  {card.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

    </section>
  );
}