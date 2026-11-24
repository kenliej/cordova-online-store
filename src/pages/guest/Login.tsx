import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { Mail, Lock, Eye, EyeOff, ShoppingCart, Store, ShieldCheck, MapPin, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth, roleHomePath } from "@/context/AuthContext";
import { getErrorMessage, getFieldErrors, isApiError } from "@/lib/api";
import { isPasswordResetEnabled } from "@/lib/features";
import logoImage from "@/assets/logo.webp";
import bgImage from "@/assets/bg-img1.webp";

interface LoginLocationState {
  from?: string;
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const user = await login({
        login: emailOrPhone.trim(),
        password,
        remember: rememberMe,
      });

      const attemptedPath = (location.state as LoginLocationState | null)?.from;
      let safeAttempted =
        attemptedPath && attemptedPath !== "/login" && attemptedPath !== "/logout" ? attemptedPath : null;
      // Guest catalog URLs map onto the customer tree after a successful login.
      if (safeAttempted?.startsWith("/guest/")) {
        safeAttempted = safeAttempted.replace(/^\/guest/, "") || "/";
      }
      navigate(safeAttempted ?? roleHomePath(user.role), { replace: true });
    } catch (loginError) {
      if (isApiError(loginError) && loginError.isRateLimited) {
        const seconds = loginError.retryAfter;
        setError(
          seconds
            ? `Too many login attempts. Please try again in ${seconds} second${seconds === 1 ? "" : "s"}.`
            : "Too many login attempts. Please wait a moment and try again.",
        );
      } else if (isApiError(loginError) && loginError.isValidation) {
        const errors = getFieldErrors(loginError);
        setFieldErrors(errors);
        if (Object.keys(errors).length === 0) {
          setError(getErrorMessage(loginError, "Invalid credentials. Please try again."));
        }
      } else {
        setError(getErrorMessage(loginError, "Unable to log in. Please try again."));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans">
      {/* Background Image with Fixed Parallax Effect & Overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-fixed z-0 filter blur-xs"
        style={{ backgroundImage: `url(${bgImage})` }}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      </div>

      {/* Main Login Modal Box */}
      <div className="relative z-10 w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 border border-white/20">
        {/* LEFT PANEL: Branding & Value Props (5 cols) - No background image */}
        <div className="md:col-span-5 bg-gradient-to-br from-[#1c4b6e] via-[#215a85] to-[#143752] text-white p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10 space-y-6">
            {/* Logo */}
            <div className="flex flex-col items-start space-y-1">
              <img
                src={logoImage}
                alt="Online Mall Logo"
                className="h-16 w-auto object-contain brightness-0 invert drop-shadow"
              />
              <span className="text-xl font-black tracking-widest uppercase text-sky-300">ONLINE MALL</span>
            </div>

            {/* Headline */}
            <div className="space-y-1">
              <h2 className="text-2xl sm:text-3xl font-black leading-tight text-white">Shop Smarter.</h2>
              <h2 className="text-2xl sm:text-3xl font-black leading-tight text-[#3087C5]">
                Pick Up <span className="text-sky-400">Safer.</span>
              </h2>
              <p className="text-xs text-gray-200 font-medium leading-relaxed pt-1">
                Discover your favorite products, check store availability, and order online. Then simply pay and
                claim at the mall.
              </p>
            </div>

            {/* Feature Bullets */}
            <div className="space-y-3.5 pt-2">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-sky-400/20 text-sky-300 flex items-center justify-center shrink-0 border border-sky-400/30">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white leading-tight">Wide Selection</h4>
                  <p className="text-[10px] text-gray-300">Products from your favorite stores all in one place.</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-sky-400/20 text-sky-300 flex items-center justify-center shrink-0 border border-sky-400/30">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white leading-tight">Mall Stores</h4>
                  <p className="text-[10px] text-gray-300">View store details, hours, and contacts.</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-sky-400/20 text-sky-300 flex items-center justify-center shrink-0 border border-sky-400/30">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white leading-tight">Secure & Verified</h4>
                  <p className="text-[10px] text-gray-300">Safe and trusted shopping experience.</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-sky-400/20 text-sky-300 flex items-center justify-center shrink-0 border border-sky-400/30">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white leading-tight">Pay at the Mall</h4>
                  <p className="text-[10px] text-gray-300">No delivery. Just order, claim, and enjoy!</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-6 text-[10px] font-semibold text-sky-200/70">© Online Mall Cordova</div>
        </div>

        {/* RIGHT PANEL: Login Form (7 cols) */}
        <div className="md:col-span-7 bg-[#EBE9E1]/60 p-6 sm:p-10 flex flex-col justify-center space-y-6">
          <div>
            <h1 className="text-3xl font-black text-[#1c4b6e] tracking-tight mb-1">Welcome Back!</h1>
            <p className="text-sm font-semibold text-gray-600">
              Log in to your account and continue shopping at the mall.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-800"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4" noValidate>
            {/* Email or Phone Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                autoComplete="username"
                value={emailOrPhone}
                onChange={(event) => {
                  setEmailOrPhone(event.target.value);
                  setFieldErrors({});
                }}
                className={`w-full bg-white border rounded-full py-3 pl-10 pr-4 text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none shadow-xs ${
                  fieldErrors.login ? "border-rose-400" : "border-gray-300 focus:border-[#3087C5]"
                }`}
                placeholder="Email or Phone Number"
              />
            </div>
            {fieldErrors.login && <p className="-mt-2 pl-4 text-[11px] font-bold text-rose-600">{fieldErrors.login}</p>}

            {/* Password Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setFieldErrors({});
                }}
                className={`w-full bg-white border rounded-full py-3 pl-10 pr-10 text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none shadow-xs ${
                  fieldErrors.password ? "border-rose-400" : "border-gray-300 focus:border-[#3087C5]"
                }`}
                placeholder="Password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="-mt-2 pl-4 text-[11px] font-bold text-rose-600">{fieldErrors.password}</p>
            )}

            {/* Options Row */}
            <div className="flex items-center justify-between text-xs font-bold pt-1">
              <label className="flex items-center space-x-2 cursor-pointer text-gray-700">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  className="w-4 h-4 text-[#3087C5] rounded border-gray-300 focus:ring-[#3087C5]"
                />
                <span>Remember me</span>
              </label>
              {isPasswordResetEnabled && (
                <Link to="/forgot-password" className="text-[#3087C5] hover:underline">
                  Forgot Password?
                </Link>
              )}
            </div>

            {/* Main Log In Button */}
            <div className="pt-2">
              <Button
                variant="gold"
                size="lg"
                type="submit"
                disabled={isSubmitting}
                loading={isSubmitting}
                className="w-full justify-center py-3 text-base font-extrabold shadow-md uppercase tracking-wider"
              >
                <span>{isSubmitting ? "Logging in…" : "Log In"}</span>
              </Button>
            </div>
          </form>

          {/* Register Callout Footer */}
          <p className="text-center text-xs font-semibold text-gray-600 pt-2">
            Don't have an account?{" "}
            <Link to="/register" className="text-[#3087C5] font-black hover:underline">
              Register now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
