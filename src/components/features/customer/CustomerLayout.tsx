import { Outlet } from "react-router";
import { CustomerHeader } from "@/components/common/CustomerHeader"; // or your header path
import { Footer } from "@/components/common/Footer";

export function CustomerLayout() {
  return (
    <div className="flex flex-col min-h-screen font-sans bg-white">
      {/* Sticky Header */}
      <CustomerHeader />

      {/* Page Content renders here */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}