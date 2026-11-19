import { useCallback, useEffect, useState } from "react";
import { HomeHeroSection } from "@/components/features/customer/home/home-hero-section";
import { HomeSection1 } from "@/components/features/customer/home/home-section1";
import { HomeSection2 } from "@/components/features/customer/home/home-section2";
import { HomeSection3 } from "@/components/features/customer/home/home-section3";
import { fetchHome, getErrorMessage } from "@/lib/api";
import type { HomeData } from "@/lib/types";

export default function CustomerHomePage() {
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadHome = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await fetchHome();
      setHomeData(data);
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Could not load the home page. Please try again."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHome();
  }, [loadHome]);

  const featured = homeData?.featuredProducts?.length
    ? homeData.featuredProducts
    : (homeData?.newArrivals ?? []);

  return (
    <div className="min-h-screen bg-gray-50">
      <main>
        <HomeHeroSection />
        <HomeSection1 />
        <HomeSection2
          products={featured}
          loading={isLoading}
          error={error}
          onRetry={() => void loadHome()}
        />
        <HomeSection3
          stores={homeData?.stores ?? []}
          loading={isLoading}
          error={error}
          onRetry={() => void loadHome()}
        />
      </main>
    </div>
  );
}
