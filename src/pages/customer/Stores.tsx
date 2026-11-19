import { StoresHeroSection } from "@/components/features/customer/stores/stores-hero-section";
import { StoresSection1 } from "@/components/features/customer/stores/stores-section1";


export default function CustomerStoresPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      
      <main>
        <StoresHeroSection />
        <StoresSection1 />
      </main>
       
      </div>
  );
}