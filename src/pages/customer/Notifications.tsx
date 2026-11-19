import { NotificationsHeroSection } from "@/components/features/customer/notifications/notifications-hero-section";
import { NotificationsSection1 } from "@/components/features/customer/notifications/notifications-section1";


export default function CustomerNotificationsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      
      <main>
        <NotificationsHeroSection />
        <NotificationsSection1 />
      </main>
       
      </div>
  );
}