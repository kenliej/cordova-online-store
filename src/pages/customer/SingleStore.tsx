import { useState } from "react";
import { Link, useParams } from "react-router";
import { 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Store as StoreIcon 
} from "lucide-react";

// Mock Stores Data structure matching your fields
const STORES_DATA = [
  {
    id: 1,
    title: "McDonald's",
    category: "Foods & Beverages",
    availability: "Open", // or "Close"
    time: "6:00AM - 11:00PM",
    path: "/stores/mcdonalds",
    images: [
      "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=600&auto=format&fit=crop&q=80",
    ],
    description: "Welcome to McDonald's Cordova branch! Enjoy your favorite world-famous burgers, crispy fries, chicken McDo, and refreshing drinks right inside the mall. Fast service, comfortable dine-in area, and quick mall pick-up options available.",
    detailedHighlights: [
      {
        title: "Dine-In & Takeout",
        text: "Spacious seating area with air conditioning, perfect for families, students, and groups looking for a quick meal."
      },
      {
        title: "Mall Pick-Up Ready",
        text: "Skip the long queues by ordering online through Online Mall Cordova and picking up your freshly prepared orders directly at our counter."
      },
      {
        title: "Operating Schedule",
        text: "Open daily from 6:00 AM to 11:00 PM to serve your breakfast, lunch, dinner, and late-night cravings."
      },
      {
        title: "Quality Service",
        text: "Dedicated crew members ensuring fast, clean, and friendly customer service at all times."
      }
    ]
  }
];

export default function SingleStore() {
  const { id: _id } = useParams();

  // Find store matching ID parameter or fallback to first item
  const store = STORES_DATA[0];

  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const nextImage = () => {
    setActiveImageIndex((prev) => (prev + 1) % store.images.length);
  };

  const prevImage = () => {
    setActiveImageIndex((prev) => (prev - 1 + store.images.length) % store.images.length);
  };

  return (
    <div className="bg-[#EBE9E1] min-h-screen py-8 px-4 sm:px-6 lg:px-12 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Go Back Navigation */}
        <div>
          <Link 
            to="/stores" 
            className="inline-flex items-center space-x-1.5 text-[#3087C5] font-bold text-sm hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back to Stores</span>
          </Link>
        </div>

        {/* Main Store Section Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT: Image Gallery (5 cols) */}
          <div className="lg:col-span-5 bg-white border border-gray-200 rounded-3xl p-4 shadow-sm">
            
            {/* Main Active Image Display Box */}
            <div className="relative w-full h-80 sm:h-96 rounded-2xl overflow-hidden bg-gray-50 flex items-center justify-center mb-4">
              <img 
                src={store.images[activeImageIndex]} 
                alt={store.title} 
                className="w-full h-full object-cover transition-all duration-500"
              />

              {/* Availability Status Badge */}
              <div className={`absolute top-3 left-3 text-white text-[11px] font-black px-3 py-1 rounded-full shadow ${
                store.availability === "Open" ? "bg-[#D4A328]" : "bg-gray-500"
              }`}>
                {store.availability}
              </div>

              {/* Slider Arrows */}
              <button 
                onClick={prevImage}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-gray-800 flex items-center justify-center shadow transition-colors"
                aria-label="Previous Image"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                onClick={nextImage}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-gray-800 flex items-center justify-center shadow transition-colors"
                aria-label="Next Image"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Thumbnail Row */}
            <div className="grid grid-cols-5 gap-2">
              {store.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-full h-16 rounded-xl overflow-hidden border-2 transition-all ${
                    activeImageIndex === idx ? "border-[#3087C5] scale-105 shadow-md" : "border-gray-200 opacity-70 hover:opacity-100"
                  }`}
                >
                  <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>

          </div>

          {/* RIGHT: Store Details Info (7 cols) */}
          <div className="lg:col-span-7 bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            
            {/* Title & Category */}
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-[#3087C5] tracking-tight mb-1">
                {store.title}
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider">
                {store.category}
              </p>
            </div>

            {/* Time & Operating Schedule Box */}
            <div className="flex items-center space-x-3 bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-800">
              <div className="w-10 h-10 rounded-xl bg-[#3087C5] text-white flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Operating Hours</p>
                <p className="text-base sm:text-lg font-black text-gray-900">{store.time}</p>
              </div>
            </div>

            {/* Main Store Description */}
            <p className="text-sm sm:text-base text-gray-700 leading-relaxed font-medium">
              {store.description}
            </p>

            {/* Store Information Summary Pill */}
            <div className="pt-4 border-t border-gray-100 flex items-center space-x-2 text-xs font-bold text-gray-500">
              <StoreIcon className="w-4 h-4 text-[#3087C5]" />
              <span>Located inside Online Mall Cordova • Verified Partner Store</span>
            </div>

          </div>

        </div>

        {/* BOTTOM: Detailed Highlights / Description Section */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-bold tracking-wider text-[#3087C5] uppercase mb-1">
              Store Features & Services
            </h3>
            <div className="w-full border-t border-gray-200 my-2" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {store.detailedHighlights.map((highlight, index) => (
              <div key={index} className="space-y-1">
                <h4 className="font-extrabold text-gray-900 text-base">
                  {highlight.title}
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed font-medium">
                  {highlight.text}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}