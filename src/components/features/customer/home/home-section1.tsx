import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { ChevronLeft, ChevronRight, ArrowRight, FolderOpen } from "lucide-react";
import { ErrorBanner, LoadingState, EmptyState } from "@/components/common/Feedback";
import { fetchCategories, getErrorMessage } from "@/lib/api";
import { useBasePath } from "@/lib/useBasePath";
import type { Category } from "@/lib/types";

/** Marketing imagery per category (the API only stores category names/slugs). */
const CATEGORY_IMAGES: Record<string, string> = {
  foods: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=500&auto=format&fit=crop&q=80",
  "foods-beverages": "https://images.unsplash.com/photo-1550547660-d9450f859349?w=500&auto=format&fit=crop&q=80",
  "foods-&-beverages": "https://images.unsplash.com/photo-1550547660-d9450f859349?w=500&auto=format&fit=crop&q=80",
  fashion: "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=500&auto=format&fit=crop&q=80",
  "fashion-apparel": "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=500&auto=format&fit=crop&q=80",
  electronics: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=500&auto=format&fit=crop&q=80",
  beauty: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=500&auto=format&fit=crop&q=80",
  "beauty-personal-care": "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=500&auto=format&fit=crop&q=80",
  home: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=500&auto=format&fit=crop&q=80",
  "home-living": "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=500&auto=format&fit=crop&q=80",
  health: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80",
  "health-wellness": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80",
  toys: "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=500&auto=format&fit=crop&q=80",
  "toys-games": "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=500&auto=format&fit=crop&q=80",
  sports: "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=500&auto=format&fit=crop&q=80",
  books: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=500&auto=format&fit=crop&q=80",
  computer: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500&auto=format&fit=crop&q=80",
  others: "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=500&auto=format&fit=crop&q=80",
};

const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=500&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=500&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=500&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=500&auto=format&fit=crop&q=80",
];

function categoryImage(category: Category, index: number): string {
  const slugKey = category.slug.toLowerCase();
  const nameKey = category.name.toLowerCase().replace(/\s+/g, "-").replace(/&/g, "");
  return (
    CATEGORY_IMAGES[slugKey] ??
    CATEGORY_IMAGES[nameKey] ??
    CATEGORY_IMAGES[slugKey.split("-")[0] ?? ""] ??
    FALLBACK_IMAGES[index % FALLBACK_IMAGES.length]
  );
}

export function HomeSection1() {
  const basePath = useBasePath();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await fetchCategories("product");
      setCategories(data);
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Could not load categories."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  // Auto loop carousel timer (changes every 3.5 seconds)
  useEffect(() => {
    if (categories.length === 0) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % categories.length);
    }, 3500);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [currentIndex, categories.length]);

  const handlePrev = () => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? categories.length - 1 : prevIndex - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % categories.length);
  };

  return (
    <section className="bg-[#EBE9E1] w-full py-12 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Shop By Category</h2>
          <Link
            to={`${basePath}/products`}
            className="flex items-center space-x-1 text-sm font-bold text-sky-600 hover:text-sky-700 transition-colors group"
          >
            <span>View All</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {isLoading && <LoadingState label="Loading categories…" />}
        {!isLoading && error && <ErrorBanner message={error} onRetry={() => void loadCategories()} />}
        {!isLoading && !error && categories.length === 0 && (
          <EmptyState
            icon={<FolderOpen className="w-10 h-10" />}
            title="No categories available yet"
            description="Categories will appear here as soon as the mall adds them."
          />
        )}

        {!isLoading && !error && categories.length > 0 && (
          <>
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
                    transform: `translateX(-${
                      currentIndex *
                      (100 / (window.innerWidth >= 1024 ? 5 : window.innerWidth >= 640 ? 3 : 2))
                    }%)`,
                  }}
                >
                  {categories.map((category, index) => (
                    <div key={category.id || category.slug || category.name} className="w-1/2 sm:w-1/3 lg:w-1/5 shrink-0 px-1">
                      <Link to={`${basePath}/products?category=${encodeURIComponent(category.slug || category.name)}`}>
                        <div className="bg-white border border-gray-200/80 hover:border-sky-500 rounded-2xl p-4 text-center shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col items-center justify-between h-48 group/card">
                          {/* Category Image */}
                          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center p-2 mb-3">
                            <img
                              src={categoryImage(category, index)}
                              alt={category.displayName || category.name}
                              loading="lazy"
                              className="w-full h-full object-cover rounded-lg group-hover/card:scale-110 transition-transform duration-500"
                            />
                          </div>

                          {/* Category Name */}
                          <p className="text-xs sm:text-sm font-bold text-gray-800 group-hover/card:text-sky-600 transition-colors line-clamp-2">
                            {category.displayName || category.name}
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
              {categories.map((category, index) => (
                <button
                  key={category.id || `${category.slug}-${index}`}
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
