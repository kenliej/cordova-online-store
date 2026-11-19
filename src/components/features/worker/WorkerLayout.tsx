import { Outlet } from "react-router";
import { WorkerHeader } from "@/components/common/WorkerHeader"; // or your header path
import { Footer } from "@/components/common/Footer";

export function WorkerLayout() {
  return (
    <div className="flex flex-col min-h-screen font-sans bg-white">
      {/* Sticky Header */}
      <WorkerHeader />

      {/* Page Content renders here */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}