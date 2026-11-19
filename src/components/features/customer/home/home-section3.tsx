import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { ChevronLeft, ChevronRight, ArrowRight, Clock, Phone, Store as StoreIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorBanner, LoadingState } from "@/components/common/Feedback";
import { useBasePath } from "@/lib/useBasePath";
import type { Store } from "@/lib/types";

interface HomeSection3Props {
  stores: Store[];
  loading: boolean;
  error: string;
  onRetry: () => void;
}

export function HomeSection3({ stores, loading, error, onRetry }: HomeSection3Props) {
  const basePath = useBasePath();
  const [currentIndex, setCurrentIndex] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto loop carousel timer (changes every 3.5 seconds)
  useEffect(() => {
    if (stores.length === 0) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % stores.length);
    }, 3500);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [currentIndex, stores.length]);

  const handlePrev = () => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? stores.length - 1 : prevIndex - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % stores.length);
  };

  return (
    <section className="bg-[#EBE9E1] w-full py-12 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Stores in the Mall</h2>
          <Link
            to={`${basePath}/stores`}
            className="flex items-center space-x-1 text-sm font-bold text-sky-600 hover:text-sky-700 transition-colors group"
          >
            <span>View All</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {loading && <LoadingState label="Loading stores…" />}
        {!loading && error && <ErrorBanner message={error} onRetry={onRetry} />}
        {!loading && !error && stores.length === 0 && (
          <EmptyState
            icon={<StoreIcon className="w-10 h-10" />}
            title="No stores listed yet"
            description="Mall stores will appear here once they are added by the administrator."
          />
        )}

        {!loading && !error && stores.length > 0 && (
          <>
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
                    transform: `translateX(-${
                      currentIndex * (100 / (window.innerWidth >= 1024 ? 4 : window.innerWidth >= 640 ? 2 : 1))
                    }%)`,
                  }}
                >
                  {stores.map((store) => {
                    const storePath = `${basePath}/stores/${store.slug}`;
                    return (
                      <div key={store.id} className="w-full sm:w-1/2 lg:w-1/4 shrink-0 px-1">
                        <div className="bg-white border border-gray-200/80 hover:border-sky-500 rounded-2xl p-4 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between h-auto min-h-[320px] group/card">
                          <div>
                            {/* Store Image Box */}
                            <Link to={storePath}>
                              <div className="w-full h-32 sm:h-36 rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center mb-3">
                                {store.image ? (
                                  <img
                                    src={store.image}
                                    alt={store.name}
                                    loading="lazy"
                                    className="w-full h-full object-cover rounded-xl group-hover/card:scale-110 transition-transform duration-500"
                                  />
                                ) : (
                                  <span className="text-[10px] font-bold text-gray-400">No photo</span>
                                )}
                              </div>
                            </Link>

                            {/* Store Name */}
                            <Link to={storePath}>
                              <h3 className="font-bold text-gray-900 text-base sm:text-lg hover:text-sky-600 transition-colors line-clamp-1 mb-2">
                                {store.name}
                              </h3>
                            </Link>

                            {/* Operating Hours */}
                            <div className="flex items-center space-x-1.5 text-xs text-gray-700 mb-1.5">
                              <Clock className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                              <span className="truncate">Open: {store.operatingHours}</span>
                            </div>

                            {/* Contact Phone */}
                            <div className="flex items-center space-x-1.5 text-xs text-gray-700 mb-4">
                              <Phone className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                              <span>{store.phone || "—"}</span>
                            </div>
                          </div>

                          {/* Open/Close Status Button (White if closed, Gold if open) */}
                          <div className="pt-1">
                            <Link to={storePath}>
                              <Button
                                variant={store.isOpen ? "gold" : "white"}
                                size="md"
                                className={`w-full justify-center text-sm font-bold shadow-sm ${
                                  store.isOpen ? "" : "border border-gray-200 text-gray-500 hover:bg-gray-50"
                                }`}
                              >
                                {store.isOpen ? "Open" : "Close"}
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Pagination Dots */}
            <div className="flex items-center justify-center space-x-2 mt-6">
              {stores.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setCurrentIndex(index)}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    currentIndex === index ? "w-8 bg-[#3087C5]" : "w-2.5 bg-gray-400/60 hover:bg-gray-500"
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
