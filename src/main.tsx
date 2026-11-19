import "@/styles/global.css";
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router";

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



createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* GUEST ROUTES */}
        <Route element={<GuestLayout />}>
          <Route path="/guest/" element={<GuestHome />} />
          <Route path="/guest/products" element={<GuestProductsPage />} />
          <Route path="/guest/products/:id" element={<GuestSingleProduct />} />
          <Route path="/guest/stores" element={<GuestStoresPage />} />
          <Route path="/guest/stores/:id" element={<GuestSingleStore />} />
          <Route path="/guest/about" element={<GuestAbout />} />
          <Route path="/guest/contact" element={<GuestContactUs />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
        </Route>

        {/* CUSTOMER ROUTES */}
        <Route element={<CustomerLayout />}>
        <Route path="/" element={<CustomerHomePage />} />
        <Route path="/products" element={<CustomerProductsPage />} />
        <Route path="/products/:id" element={<SingleProduct />} />
        <Route path="/stores" element={<CustomerStoresPage />} />
        <Route path="/stores/:id" element={<SingleStore />} />
        <Route path="/notifications" element={<CustomerNotificationsPage />} />
        <Route path="/about" element={<CustomerAboutPage />} />
        <Route path="/contact" element={<CustomerContactUsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/cart" element={<CartPage />} />
        </Route>

        {/* WORKER ROUTES */}
        <Route element={<WorkerLayout />}>
          <Route path="/worker/orders" element={<OrdersPage />} />
          <Route path="/worker/products" element={<WorkerProductsPage />} />
        </Route>

        {/* ADMIN ROUTES */}
        <Route element={<AdminLayout />}>
          <Route path="/admin/accounts" element={<AccountsDashboard />} />
          <Route path="/admin/stores" element={<StoreDashboard />} />
          <Route path="/admin/sales" element={<Sales />} />
        </Route>

      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);