import { ContactUsHeroSection } from "@/components/features/customer/contact-us/contact-us-herc-section";
import { ContactUsSection1 } from "@/components/features/customer/contact-us/contact-us-section1";
import { ContactUsSection2 } from "@/components/features/customer/contact-us/contact-us-section2";

export default function CustomerContactUsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      
      <main>
        <ContactUsHeroSection />
        <ContactUsSection1 />
        <ContactUsSection2 />
      </main>
       
      </div>
  );
}