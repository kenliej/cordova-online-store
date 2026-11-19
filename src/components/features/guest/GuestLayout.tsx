import { Outlet } from "react-router";
import { GuestHeader } from "@/components/common/GuestHeader"; // or your header path
import { Footer } from "@/components/common/Footer";

export function GuestLayout() {
  return (
    <div className="flex flex-col min-h-screen font-sans bg-white">
      {/* Sticky Header */}
      <GuestHeader />

      {/* Page Content renders here */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}