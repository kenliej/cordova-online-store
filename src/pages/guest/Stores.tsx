import { StoresHeroSection } from "@/components/features/guest/stores/stores-hero-section";
import { StoresSection1 } from "@/components/features/guest/stores/stores-section1";


export default function GuestStoresPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      
      <main>
        <StoresHeroSection />
        <StoresSection1 />
      </main>
       
      </div>
  );
}