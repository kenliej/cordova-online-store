
import { HomeHeroSection } from "@/components/features/guest/home/home-hero-section";
import { HomeSection1 } from "@/components/features/guest/home/home-section1";
import { HomeSection2 } from "@/components/features/guest/home/home-section2";
import { HomeSection3 } from "@/components/features/guest/home/home-section3";

export default function GuestHomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      
      <main>
        <HomeHeroSection />
        <HomeSection1 />
        <HomeSection2 />
        <HomeSection3 />
      </main>
       
      </div>
  );
}