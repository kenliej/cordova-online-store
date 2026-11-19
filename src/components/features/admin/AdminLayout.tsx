import { Outlet } from "react-router";
import { AdminHeader } from "@/components/common/AdminHeader"; // or your header path
import { Footer } from "@/components/common/Footer";

export function AdminLayout() {
  return (
    <div className="flex flex-col min-h-screen font-sans bg-white">
      {/* Sticky Header */}
      <AdminHeader />

      {/* Page Content renders here */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}