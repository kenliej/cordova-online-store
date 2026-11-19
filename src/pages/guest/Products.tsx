import { ProductsHeroSection } from "@/components/features/guest/products/products-hero-section";
import { ProductsSection1 } from "@/components/features/guest/products/products-section1";


export default function GuestProductsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      
      <main>
        <ProductsHeroSection />
        <ProductsSection1 />
      </main>
       
      </div>
  );
}