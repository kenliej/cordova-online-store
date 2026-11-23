import "@/styles/global.css";
import React, { useEffect, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from "react-router";
import { Loader2 } from "lucide-react";

import { AuthProvider, roleHomePath, useAuth } from "@/context/AuthContext";
import { ToastProvider } from "@/components/common/Toast";
import type { Role } from "@/lib/types";

//GUEST
import { GuestLayout } from "@/components/features/guest/GuestLayout";
import GuestHome from "@/pages/guest/Home";
import GuestAbout from "@/pages/guest/About";
import GuestProductsPage from "@/pages/guest/Products";
import GuestSingleProduct from "@/pages/guest/SingleProduct";
import GuestStoresPage from "@/pages/guest/Stores";
import GuestSingleStore from "@/pages/guest/SingleStore";
import GuestContactUs from "@/pages/guest/ContactUs";
import Login from "@/pages/guest/Login";
import Register from "@/pages/guest/Register";
import ForgotPassword from "@/pages/guest/ForgotPassword";
import Terms from "@/pages/guest/Terms";
import Privacy from "@/pages/guest/Privacy";

//CUSTOMER
import { CustomerLayout } from "@/components/features/customer/CustomerLayout";
import CustomerHomePage from "@/pages/customer/Home";
import CustomerProductsPage from "@/pages/customer/Products";
import SingleProduct from "@/pages/customer/SingleProduct";
import CustomerStoresPage from "@/pages/customer/Stores";
import SingleStore from "@/pages/customer/SingleStore";
import CustomerNotificationsPage from "@/pages/customer/Notifications";
import CustomerAboutPage from "@/pages/customer/About";
import CustomerContactUsPage from "@/pages/customer/ContactUs";
import ProfilePage from "@/pages/customer/Profile";
import CartPage from "@/pages/customer/Cart";

//WORKER
import { WorkerLayout } from "@/components/features/worker/WorkerLayout";
import OrdersPage from "@/pages/worker/Orders";
import WorkerProductsPage from "@/pages/worker/WorkerProducts";

//ADMIN
import { AdminLayout } from "@/components/features/admin/AdminLayout";
import AccountsDashboard from "@/pages/admin/AccountsDashboard";
import StoreDashboard from "@/pages/admin/StoreDashboard";
import Sales from "@/pages/admin/Sales";

/** Full-screen splash shown while the session bootstraps. */
function Splash({ label = "Loading your session…" }: { label?: string }) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center gap-4 bg-[#FAF7E8] text-gray-600">
      <Loader2 className="w-10 h-10 animate-spin text-[#3087C5]" />
      <p className="text-sm font-bold tracking-wide">{label}</p>
    </div>
  );
}

/**
 * Route guard for authenticated areas.
 * - loading       → splash
 * - guest         → /login (remembering the attempted path)
 * - wrong role    → that role's home
 * - unknown role  → /login
 */
function RequireRole({ roles, children }: { roles: Role[]; children?: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Splash />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!roles.includes(user.role)) return <Navigate to={roleHomePath(user.role)} replace />;
  return children ?? <Outlet />;
}

/** Guest-only pages: logged-in visitors are bounced to their role home. */
function GuestOnly() {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  if (user) return <Navigate to={roleHomePath(user.role)} replace />;
  return <Outlet />;
}

/** `/logout` compatibility route for the legacy header links. */
function LogoutRoute() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    void logout().finally(() => {
      if (active) navigate("/login", { replace: true });
    });
    return () => {
      active = false;
    };
  }, [logout, navigate]);

  return <Splash label="Signing you out…" />;
}

/** Unknown paths fall back to the visitor's role home. */
function NotFoundRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  return <Navigate to={user ? roleHomePath(user.role) : "/guest/"} replace />;
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ToastProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* AUTH / GUEST-ONLY ROUTES */}
            <Route path="/guest" element={<Navigate to="/guest/" replace />} />
            <Route element={<GuestOnly />}>
              <Route element={<GuestLayout />}>
                <Route path="/guest/" element={<GuestHome />} />
                <Route path="/guest/products" element={<GuestProductsPage />} />
                <Route path="/guest/products/:slug" element={<GuestSingleProduct />} />
                <Route path="/guest/stores" element={<GuestStoresPage />} />
                <Route path="/guest/stores/:slug" element={<GuestSingleStore />} />
                <Route path="/guest/about" element={<GuestAbout />} />
                <Route path="/guest/contact" element={<GuestContactUs />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
              </Route>
            </Route>

            {/* PASSWORD RESET LINKS
                Public (even when already signed in) so e-mail links always open
                the reset form instead of redirecting to the guest/login pages. */}
            <Route element={<GuestLayout />}>
              <Route path="/reset-password" element={<ForgotPassword />} />
              <Route path="/reset-password/:token" element={<ForgotPassword />} />
            </Route>

            {/* CUSTOMER ROUTES */}
            <Route element={<RequireRole roles={["customer"]} />}>
              <Route element={<CustomerLayout />}>
                <Route path="/" element={<CustomerHomePage />} />
                <Route path="/products" element={<CustomerProductsPage />} />
                <Route path="/products/:slug" element={<SingleProduct />} />
                <Route path="/stores" element={<CustomerStoresPage />} />
                <Route path="/stores/:slug" element={<SingleStore />} />
                <Route path="/notifications" element={<CustomerNotificationsPage />} />
                <Route path="/about" element={<CustomerAboutPage />} />
                <Route path="/contact" element={<CustomerContactUsPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/cart" element={<CartPage />} />
              </Route>
            </Route>

            {/* WORKER ROUTES */}
            <Route element={<RequireRole roles={["worker", "admin"]} />}>
              <Route element={<WorkerLayout />}>
                <Route path="/worker/orders" element={<OrdersPage />} />
                <Route path="/worker/products" element={<WorkerProductsPage />} />
              </Route>
            </Route>

            {/* ADMIN ROUTES */}
            <Route element={<RequireRole roles={["admin"]} />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin/accounts" element={<AccountsDashboard />} />
                <Route path="/admin/stores" element={<StoreDashboard />} />
                <Route path="/admin/sales" element={<Sales />} />
              </Route>
            </Route>

            {/* SESSION */}
            <Route path="/logout" element={<LogoutRoute />} />

            {/* FALLBACK */}
            <Route path="*" element={<NotFoundRedirect />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ToastProvider>
  </React.StrictMode>,
);
