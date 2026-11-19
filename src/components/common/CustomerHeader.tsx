import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  Search,
  User,
  LogOut,
  ShoppingCart,
  Home,
  Package,
  Store,
  Bell,
  Info,
  Mail,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { InlineSpinner } from "@/components/common/Feedback";
import { useAuth } from "@/context/AuthContext";
import { getErrorMessage } from "@/lib/api";
import { formatNumber, initials } from "@/lib/format";
import logoImage from "@/assets/logo.webp";

/**
 * Header for authenticated customers: session-aware profile/logout, cart badge.
 */
export function CustomerHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, cartCount, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  // Auto-hide header on scroll down / show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < 10) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 80) {
        setIsVisible(false); // Scrolling DOWN -> hide header
      } else {
        setIsVisible(true); // Scrolling UP -> show header
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
    { name: "Notifications", path: "/notifications", icon: Bell },
    { name: "About", path: "/about", icon: Info },
    { name: "Contact Us", path: "/contact", icon: Mail },
  ];

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    const query = searchQuery.trim();
    navigate(query ? `/products?search=${encodeURIComponent(query)}` : "/products");
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setLogoutError("");
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      setLogoutError(getErrorMessage(error, "Could not log out. Please try again."));
    } finally {
      setIsLoggingOut(false);
    }
  };

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname === path;

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
              <img src={logoImage} alt="Online Mall Logo" className="w-10 h-10 sm:w-14 sm:h-14 object-contain" />
              <div className="hidden md:flex flex-col">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-sky-700 uppercase leading-none">
                  Online Mall
                </span>
                <span className="text-[10px] tracking-widest text-sky-600 font-bold uppercase mt-0.5">Cordova</span>
              </div>
            </Link>

            {/* 2. Search Bar */}
            <form onSubmit={handleSearch} className="flex-1 max-w-xl mx-1 sm:mx-4" role="search">
              <div className="flex items-center rounded-full border border-gray-300 bg-white overflow-hidden shadow-inner focus-within:ring-2 focus-within:ring-sky-500">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search..."
                  aria-label="Search products"
                  className="w-full px-3 sm:px-5 py-1.5 sm:py-2 text-xs sm:text-sm outline-none text-gray-700 placeholder-gray-400"
                />
                <button
                  type="submit"
                  aria-label="Search"
                  className="bg-sky-600 hover:bg-sky-700 text-white px-3 sm:px-5 py-2 sm:py-2.5 flex items-center justify-center transition-colors"
                >
                  <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            </form>

            {/* 3. Desktop Profile / Logout Buttons (Hidden on mobile, moved to side drawer) */}
            <div className="hidden md:flex items-center space-x-3 shrink-0">
              <Link
                to="/profile"
                className="flex items-center space-x-2 rounded-full bg-white border border-gray-200 px-2.5 py-1 shadow-sm hover:bg-gray-50 transition-colors"
                title={user?.name ?? "Profile"}
              >
                {user?.profilePhoto ? (
                  <img
                    src={user.profilePhoto}
                    alt={user.name}
                    className="w-8 h-8 rounded-full object-cover border border-amber-200"
                  />
                ) : (
                  <span className="w-8 h-8 rounded-full bg-[#3087C5] text-white text-xs font-black flex items-center justify-center">
                    {initials(user?.name)}
                  </span>
                )}
                <span className="max-w-[7.5rem] truncate text-xs font-bold text-gray-800">
                  {user?.name?.split(" ")[0] ?? "Profile"}
                </span>
              </Link>

              <Button variant="gold" size="md" onClick={handleLogout} disabled={isLoggingOut}>
                {isLoggingOut ? <InlineSpinner /> : <LogOut className="w-4 h-4" />}
                <span>{isLoggingOut ? "Logging out…" : "Logout"}</span>
              </Button>
            </div>

            {/* 4. Mobile Right Controls: [Hamburger Menu, Cart] */}
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

              {/* Shopping Cart */}
              <Link
                to="/cart"
                className="text-sky-600 hover:text-sky-700 p-1.5 transition-colors relative"
                title="Shopping Cart"
              >
                <ShoppingCart className="w-6 h-6 sm:w-7 sm:h-7" />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-full bg-[#D4A328] text-white text-[10px] font-black flex items-center justify-center shadow">
                    {formatNumber(cartCount)}
                  </span>
                )}
              </Link>
            </div>
          </div>
          {logoutError && (
            <p className="max-w-7xl mx-auto mt-1 text-right text-[11px] font-bold text-rose-600">{logoutError}</p>
          )}
        </div>

        {/* Desktop Navigation Bar (Blue Background - Hidden on mobile) */}
        <div className="hidden md:block bg-[#3087C5] px-4 shadow-md py-[0px]">
          <div className="max-w-7xl mx-auto flex items-center">
            <nav className="flex space-x-1 py-[0px]">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const active = isActive(link.path);

                return (
                  <Link
                    key={link.name}
                    to={link.path}
                    className={`flex items-center space-x-2 text-sm font-semibold px-4 py-2.5 transition-all ${
                      active
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
            aria-label="Close Navigation Menu"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Profile / Logout Actions in Drawer */}
        <div className="p-4 border-b border-sky-600/50 flex flex-col gap-2">
          <div className="flex items-center space-x-2 px-1 pb-1">
            {user?.profilePhoto ? (
              <img src={user.profilePhoto} alt={user.name} className="w-9 h-9 rounded-full object-cover" />
            ) : (
              <span className="w-9 h-9 rounded-full bg-[#D4A328] text-white text-xs font-black flex items-center justify-center">
                {initials(user?.name)}
              </span>
            )}
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">{user?.name}</p>
              <p className="text-[11px] text-sky-100 truncate">{user?.email}</p>
            </div>
          </div>
          <Link to="/profile" onClick={() => setIsMenuOpen(false)}>
            <Button variant="gold" className="w-full justify-center">
              <User className="w-4 h-4" />
              <span>Profile</span>
            </Button>
          </Link>
          <Button variant="white" className="w-full justify-center" onClick={handleLogout} disabled={isLoggingOut}>
            {isLoggingOut ? <InlineSpinner /> : <LogOut className="w-4 h-4 text-gray-700" />}
            <span className="text-gray-900">{isLoggingOut ? "Logging out…" : "Logout"}</span>
          </Button>
        </div>

        {/* Nav Links in Drawer */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.path);

            return (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setIsMenuOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                  active ? "bg-[#D4A328] text-white font-bold shadow-md" : "text-white hover:bg-sky-600/60"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{link.name}</span>
                {link.path === "/notifications" && cartCount > 0 && null}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
