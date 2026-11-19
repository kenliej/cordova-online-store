import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router";
import { 
  Search, 
  User, 
  UserPlus, 
  Home, 
  Package, 
  Store, 
  Info, 
  Mail,
  Menu,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import logoImage from "@/assets/logo.webp";

export function GuestHeader() {
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
    { name: "Home", path: "/", icon: Home },
    { name: "Products", path: "/products", icon: Package },
    { name: "Stores", path: "/stores", icon: Store },
    { name: "About", path: "/about", icon: Info },
    { name: "Contact Us", path: "/contact", icon: Mail },
  ];

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 w-full font-sans shadow-sm transition-transform duration-300 ease-in-out ${
          isVisible ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        {/* Top Bar (Cream Background) */}
        <div className="bg-[#FAF7E8] px-3 sm:px-4 py-2 sm:py-3 border-b border-amber-100">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
            
            {/* 1. Logo & Title (Text hidden on mobile, visible on md+) */}
            <Link to="/" className="flex items-center space-x-2 shrink-0">
              <img 
                src={logoImage} 
                alt="Online Mall Logo" 
                className="w-10 h-10 sm:w-14 sm:h-14 object-contain" 
              />
              <div className="hidden md:flex flex-col">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-sky-700 uppercase leading-none">
                  Online Mall
                </span>
                <span className="text-[10px] tracking-widest text-sky-600 font-bold uppercase mt-0.5">
                  Cordova
                </span>
              </div>
            </Link>

            {/* 2. Search Bar */}
            <div className="flex-1 max-w-xl mx-1 sm:mx-4">
              <div className="flex items-center rounded-full border border-gray-300 bg-white overflow-hidden shadow-inner focus-within:ring-2 focus-within:ring-sky-500">
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full px-3 sm:px-5 py-1.5 sm:py-2 text-xs sm:text-sm outline-none text-gray-700 placeholder-gray-400"
                />
                <button 
                  type="button" 
                  className="bg-sky-600 hover:bg-sky-700 text-white px-3 sm:px-5 py-2 sm:py-2.5 flex items-center justify-center transition-colors"
                >
                  <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>

            {/* 3. Desktop Auth Buttons (Hidden on mobile, moved to side drawer) */}
            <div className="hidden md:flex items-center space-x-3 shrink-0">
              <Link to="/login">
                <Button variant="gold" size="md">
                  <User className="w-4 h-4" />
                  <span>Login</span>
                </Button>
              </Link>

              <Link to="/register">
                <Button variant="white" size="md">
                  <UserPlus className="w-4 h-4 text-gray-700" />
                  <span className="text-gray-900">Register</span>
                </Button>
              </Link>
            </div>

            {/* 4. Mobile Right Controls: [Hamburger Menu] */}
            <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
              {/* Hamburger Toggle (Mobile Only) */}
              <button
                type="button"
                onClick={() => setIsMenuOpen(true)}
                className="md:hidden text-sky-700 hover:text-sky-900 p-1.5 rounded-lg focus:outline-none"
                aria-label="Open Navigation Menu"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>

          </div>
        </div>

        {/* Desktop Navigation Bar (Blue Background - Hidden on mobile) */}
        <div className="hidden md:block bg-[#3087C5] px-4 shadow-md py-[0px]">
          <div className="max-w-7xl mx-auto flex items-center">
            <nav className="flex space-x-1 py-[0px]">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.path;

                return (
                  <Link
                    key={link.name}
                    to={link.path}
                    className={`flex items-center space-x-2 text-sm font-semibold px-4 py-2.5 transition-all ${
                      isActive
                        ? "bg-[#D4A328] text-white rounded-full shadow-inner"
                        : "text-white hover:bg-sky-700/50 rounded-md"
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
      <div className="h-[60px] md:h-[105px]" />

      {/* Mobile Side Drawer Overlay */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs md:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Mobile Side Menu (Blue Background) */}
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

        {/* Auth Actions in Drawer */}
        <div className="p-4 border-b border-sky-600/50 flex flex-col gap-2">
          <Link to="/login" onClick={() => setIsMenuOpen(false)}>
            <Button variant="gold" className="w-full justify-center">
              <User className="w-4 h-4" />
              <span>Login</span>
            </Button>
          </Link>
          <Link to="/register" onClick={() => setIsMenuOpen(false)}>
            <Button variant="white" className="w-full justify-center">
              <UserPlus className="w-4 h-4 text-gray-700" />
              <span className="text-gray-900">Register</span>
            </Button>
          </Link>
        </div>

        {/* Nav Links in Drawer */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;

            return (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setIsMenuOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                  isActive
                    ? "bg-[#D4A328] text-white font-bold shadow-md"
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