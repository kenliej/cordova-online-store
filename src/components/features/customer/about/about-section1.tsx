import { 
  ShoppingCart, 
  ShieldCheck, 
  Clock, 
  MapPin, 
  Headphones, 
  Store, 
  Package, 
  Users 
} from "lucide-react";
import bgImage from "@/assets/bg-img1.webp";

export function AboutSection1() {
  const whyShopCards = [
    {
      icon: ShoppingCart,
      title: "Wide Selection",
      description: "Find Products from Multiple Stores in one Place.",
      image: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=500&auto=format&fit=crop&q=80",
    },
    {
      icon: ShieldCheck,
      title: "Secure & Safe",
      description: "Your data and transactions are protected.",
      image: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=500&auto=format&fit=crop&q=80",
    },
    {
      icon: Clock,
      title: "Save Time",
      description: "Order online and claim at the mall.",
      image: "https://images.unsplash.com/photo-1508962914676-134849a727f0?w=500&auto=format&fit=crop&q=80",
    },
    {
      icon: MapPin,
      title: "Real Store Access",
      description: "Explore stores details, hours, and contact info.",
      image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=500&auto=format&fit=crop&q=80",
    },
    {
      icon: Headphones,
      title: "Always Here",
      description: "Get support whenever you need it.",
      image: "https://images.unsplash.com/photo-1534536281715-e28d76689b4d?w=500&auto=format&fit=crop&q=80",
    },
  ];

  return (
    <section className="bg-[#EBE9E1] w-full py-14 px-4 sm:px-8 lg:px-16 font-sans space-y-16">
      <div className="max-w-7xl mx-auto space-y-16">

        {/* 1. OUR STORY SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Hand holding Phone illustration box */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-md h-80 sm:h-96 rounded-3xl overflow-hidden shadow-xl border border-gray-200">
              <img 
                src="https://images.unsplash.com/photo-1512428559087-560fa5ceab42?w=800&auto=format&fit=crop&q=80" 
                alt="Hand holding phone with Online Mall app"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Right Text Content */}
          <div className="lg:col-span-7 space-y-4 text-gray-800">
            <h2 className="text-3xl sm:text-4xl font-black text-[#3087C5] tracking-tight">
              Our Story
            </h2>

            <p className="text-sm sm:text-base font-bold text-gray-900 leading-relaxed">
              The Online Mall Shopping Website was created with a simple goal: to make shopping easier, faster, and more convenient for everyone.
            </p>

            <p className="text-xs sm:text-sm text-gray-700 leading-relaxed font-medium">
              We understand the challenges of traditional mall shopping — long lines, out-of-stock items, and the hassle of searching for products and stores. That's why we built a digital platform that brings the mall experience to your fingertips.
            </p>

            <p className="text-xs sm:text-sm text-gray-700 leading-relaxed font-medium">
              Here, you can browse products, check real-time stock, explore stores and their details, and order online. Once your order is ready, you can simply go to the mall, pay, and claim it — no more waiting in line.
            </p>

            <p className="text-xs sm:text-sm text-gray-700 leading-relaxed font-medium">
              We're committed to giving you a safer, smarter, and more enjoyable shopping experience, while also supporting our mall stores and community.
            </p>
          </div>

        </div>

        {/* 2. WHY SHOP WITH US? SECTION */}
        <div className="space-y-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-[#3087C5] tracking-tight">
            Why Shop With Us?
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {whyShopCards.map((card, idx) => {
              const Icon = card.icon;
              return (
                <div 
                  key={idx}
                  className="relative h-64 rounded-2xl overflow-hidden group shadow-lg border border-gray-200/80 transition-transform duration-300 hover:-translate-y-1"
                >
                  {/* Background Image */}
                  <img 
                    src={card.image} 
                    alt={card.title} 
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />

                  {/* Dark Gradient Overlay for Text Visibility */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />

                  {/* Card Content Overlay */}
                  <div className="relative z-10 h-full p-4 flex flex-col justify-between items-center text-center text-white">
                    {/* Top Circular Icon */}
                    <div className="w-12 h-12 rounded-full bg-[#3087C5] text-white flex items-center justify-center shadow-md border-2 border-white/20 mt-2">
                      <Icon className="w-6 h-6" />
                    </div>

                    {/* Bottom Title & Description */}
                    <div className="mb-2 space-y-1">
                      <h3 className="font-black text-base leading-snug drop-shadow-sm">
                        {card.title}
                      </h3>
                      <p className="text-[11px] font-medium text-gray-200 leading-tight drop-shadow-xs">
                        {card.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. MORE THAN JUST SHOPPING SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-white/40 p-6 sm:p-8 rounded-3xl border border-gray-300/60 shadow-xs">
          
          {/* Left Text & Stats Column */}
          <div className="lg:col-span-7 space-y-8">
            
            <div className="space-y-3">
              <h2 className="text-3xl sm:text-4xl font-black text-[#3087C5] tracking-tight">
                More than Just Shopping
              </h2>
              <p className="text-xs sm:text-sm text-gray-700 leading-relaxed font-semibold max-w-xl">
                We're not just an online store — we're a platform that helps local businesses grow, makes shopping easier for customers, and brings the mall experience closer to your home, wherever you are.
              </p>
            </div>

            {/* Stats List */}
            <div className="space-y-4">
              
              {/* Stat 1 */}
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-sky-100 text-[#3087C5] flex items-center justify-center shrink-0 shadow-xs">
                  <Store className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-black text-xl text-gray-900">100+</h4>
                  <p className="text-xs font-bold text-gray-600">Stores in the mall</p>
                </div>
              </div>

              {/* Stat 2 */}
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-sky-100 text-[#3087C5] flex items-center justify-center shrink-0 shadow-xs">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-black text-xl text-gray-900">1,000+</h4>
                  <p className="text-xs font-bold text-gray-600">Products Online</p>
                </div>
              </div>

              {/* Stat 3 */}
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-sky-100 text-[#3087C5] flex items-center justify-center shrink-0 shadow-xs">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-black text-xl text-[#3087C5]">Growing</h4>
                  <p className="text-xs font-bold text-gray-600">Together with our Community</p>
                </div>
              </div>

            </div>

            {/* Slogan Prompt */}
            <div className="pt-2">
              <span className="text-lg sm:text-xl font-black text-[#3087C5] tracking-wide">
                Shop Smart. Pick Up Safer.
              </span>
            </div>

          </div>

          {/* Right Mall Exterior Image */}
          <div className="lg:col-span-5 h-72 sm:h-96 rounded-3xl overflow-hidden shadow-xl border border-gray-200">
            <img 
              src={bgImage} 
              alt="Mall Building Exterior" 
              className="w-full h-full object-cover"
            />
          </div>

        </div>

      </div>
    </section>
  );
}