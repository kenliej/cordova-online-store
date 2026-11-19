import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router";
import { 
  Users, 
  Store, 
  TrendingUp, 
  LogOut, 
  Menu,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import logoImage from "@/assets/logo.webp";

export function AdminHeader() {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Auto-hide header on scroll down / show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < 10) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 80) {
        setIsVisible(false); // Scrolling DOWN -> hide header
      } else {
        setIsVisible(true);  // Scrolling UP -> show header
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { name: "Accounts Dashboard", path: "/admin/accounts", icon: Users },
    { name: "Stores Dashboard", path: "/admin/stores", icon: Store },
    { name: "Sales", path: "/admin/sales", icon: TrendingUp },
  ];

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 w-full font-sans shadow-sm transition-transform duration-300 ease-in-out ${
          isVisible ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        {/* Top Bar (Cream Background matching reference image) */}
        <div className="bg-[#FAF7E8] px-4 sm:px-6 py-3 border-b border-amber-200/60">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            
            {/* 1. Logo & Title */}
            <Link to="/" className="flex items-center space-x-2.5 shrink-0">
              <img 
                src={logoImage} 
                alt="Online Mall Logo" 
                className="w-12 h-12 sm:w-14 sm:h-14 object-contain" 
              />
              <div className="hidden sm:flex flex-col">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-sky-700 uppercase leading-none">
                  ONLINE MALL
                </span>
                <span className="text-[10px] tracking-widest text-sky-600 font-bold uppercase mt-0.5">
                  Cordova
                </span>
              </div>
            </Link>

            {/* 2. Centered Welcome Back Admin Text */}
            <div className="flex-1 text-center">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-[#3087C5] tracking-tight">
                Welcome Back Admin
              </h1>
            </div>

            {/* 3. Desktop Logout Button */}
            <div className="hidden md:flex items-center shrink-0">
              <Link to="/logout">
                <Button variant="white" size="md" className="shadow-xs rounded-full px-5 py-2 font-bold">
                  <LogOut className="w-4 h-4 text-gray-700 mr-1.5" />
                  <span className="text-gray-900">Logout</span>
                </Button>
              </Link>
            </div>

            {/* 4. Mobile Hamburger Menu */}
            <div className="flex items-center md:hidden shrink-0">
              <button
                type="button"
                onClick={() => setIsMenuOpen(true)}
                className="text-sky-700 hover:text-sky-900 p-1.5 rounded-lg focus:outline-none"
                aria-label="Open Navigation Menu"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>

          </div>
        </div>

        {/* Desktop Navigation Bar (Blue Background with 3 menus) */}
        <div className="hidden md:block bg-[#3087C5] px-4 shadow-md">
          <div className="max-w-7xl mx-auto flex items-center py-[0px]">
            <nav className="flex space-x-3">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.path;

                return (
                  <Link
                    key={link.name}
                    to={link.path}
                    className={`flex items-center space-x-2.5 text-sm font-bold px-5 py-2.5 transition-all rounded-full ${
                      isActive
                        ? "bg-[#D4A328] text-white shadow-md"
                        : "text-white hover:bg-sky-700/60"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{link.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Spacer to prevent content from going behind fixed header */}
      <div className="h-[72px] md:h-[125px]" />

      {/* Mobile Side Drawer Overlay */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs md:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Mobile Side Menu */}
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-72 bg-[#3087C5] text-white shadow-2xl transition-transform duration-300 ease-in-out md:hidden flex flex-col ${
          isMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-4 border-b border-sky-600/50">
          <div className="flex items-center space-x-2">
            <img src={logoImage} alt="Logo" className="w-8 h-8 object-contain" />
            <span className="font-bold text-lg tracking-wide">Online Mall</span>
          </div>
          <button
            type="button"
            onClick={() => setIsMenuOpen(false)}
            className="text-white hover:bg-sky-600 p-1.5 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Logout Action in Drawer */}
        <div className="p-4 border-b border-sky-600/50 flex flex-col gap-2">
          <Link to="/logout" onClick={() => setIsMenuOpen(false)}>
            <Button variant="white" className="w-full justify-center rounded-full">
              <LogOut className="w-4 h-4 text-gray-700 mr-2" />
              <span className="text-gray-900 font-bold">Logout</span>
            </Button>
          </Link>
        </div>

        {/* Nav Links in Drawer */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1.5">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;

            return (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setIsMenuOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                  isActive
                    ? "bg-[#D4A328] text-white shadow-md"
                    : "text-white hover:bg-sky-600/60"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{link.name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}