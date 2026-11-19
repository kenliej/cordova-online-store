import { ProductsHeroSection } from "@/components/features/customer/products/products-hero-section";
import { ProductsSection1 } from "@/components/features/customer/products/products-section1";


export default function CustomerProductsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      
      <main>
        <ProductsHeroSection />
        <ProductsSection1 />
      </main>
       
      </div>
  );
}