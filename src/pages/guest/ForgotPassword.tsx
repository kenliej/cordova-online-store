import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router";
import { Mail, Lock, ShoppingCart, Store, ShieldCheck, MapPin, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getErrorMessage, getFieldErrors, isApiError, requestPasswordReset, resetPassword } from "@/lib/api";
import { isPasswordResetEnabled } from "@/lib/features";
import logoImage from "@/assets/logo.webp";
import bgImage from "@/assets/bg-img1.webp";

export default function ForgotPassword() {
  const [searchParams] = useSearchParams();
  const params = useParams();
  const navigate = useNavigate();

  // The e-mail link is /reset-password/<token>?email=… ; keep support for the
  // legacy /forgot-password?token=… query form too.
  const resetToken = searchParams.get("token") ?? params.token ?? "";
  const resetEmail = searchParams.get("email") ?? "";
  const isResetMode = Boolean(resetToken);

  const [emailOrPhone, setEmailOrPhone] = useState(resetEmail);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isResetting, setIsResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  // Production (split/token) deployments have no SMTP configured: send the
  // visitor back to login instead of showing a reset form that cannot send mail.
  if (!isPasswordResetEnabled) {
    return <Navigate to="/login" replace />;
  }

  const handleRequestReset = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      // The API intentionally returns 200 whether or not the account exists.
      await requestPasswordReset(emailOrPhone.trim());
      setIsSubmitted(true);
    } catch (requestError) {
      if (isApiError(requestError) && requestError.isRateLimited) {
        setError("Too many password reset requests. Please wait a minute and try again.");
      } else {
        setError(getErrorMessage(requestError, "Could not send the reset link. Please try again."));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setFieldErrors({});

    if (password !== confirmPassword) {
      setFieldErrors({ password_confirmation: "Passwords do not match." });
      return;
    }

    setIsResetting(true);
    try {
      await resetPassword({
        token: resetToken,
        email: resetEmail || emailOrPhone.trim(),
        password,
        passwordConfirmation: confirmPassword,
      });
      setResetDone(true);
      setTimeout(() => navigate("/login", { replace: true }), 2500);
    } catch (resetError) {
      const errors = getFieldErrors(resetError);
      if (Object.keys(errors).length > 0) setFieldErrors(errors);
      else setError(getErrorMessage(resetError, "Could not reset your password. Please request a new link."));
    } finally {
      setIsResetting(false);
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

      {/* Main Forgot Password Modal Box */}
      <div className="relative z-10 w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 border border-white/20">
        {/* LEFT PANEL: Branding & Value Props (5 cols) */}
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
              <h2 className="text-2xl sm:text-3xl font-black leading-tight text-white">
                {isResetMode ? "Choose a New Password" : "Reset Your Password"}
              </h2>
              <h2 className="text-xl sm:text-2xl font-black leading-tight text-[#3087C5]">
                Quick regain access <span className="text-sky-400">to your account</span>
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

        {/* RIGHT PANEL */}
        <div className="md:col-span-7 bg-[#EBE9E1]/60 p-6 sm:p-10 flex flex-col justify-center space-y-6">
          <div>
            <h1 className="text-3xl font-black text-[#1c4b6e] tracking-tight mb-1">
              {isResetMode ? "Set a New Password" : "Forgot Password?"}
            </h1>
            <p className="text-sm font-semibold text-gray-600">
              {isResetMode
                ? "Enter your new password below to regain access to your account."
                : "Enter the email address associated with your account and we’ll email you a reset link."}
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

          {/* RESET MODE: token present in the URL */}
          {isResetMode ? (
            resetDone ? (
              <div className="bg-white/80 border border-emerald-300 rounded-2xl p-6 text-center space-y-3 shadow-sm">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <h3 className="font-bold text-gray-900 text-lg">Password Reset Successful!</h3>
                <p className="text-xs text-gray-600">Redirecting you to the login page…</p>
                <Link to="/login" className="text-xs font-bold text-[#3087C5] hover:underline inline-block pt-2">
                  Go to Login now
                </Link>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    readOnly
                    value={resetEmail || emailOrPhone}
                    className="w-full bg-gray-50 border border-gray-200 rounded-full py-3 pl-10 pr-4 text-sm font-medium text-gray-600 focus:outline-none shadow-xs cursor-not-allowed"
                    placeholder="Email Address"
                  />
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className={`w-full bg-white border rounded-full py-3 pl-10 pr-4 text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none shadow-xs ${
                      fieldErrors.password ? "border-rose-400" : "border-gray-300 focus:border-[#3087C5]"
                    }`}
                    placeholder="New Password"
                  />
                  {fieldErrors.password && (
                    <p className="pl-4 pt-1 text-[11px] font-bold text-rose-600">{fieldErrors.password}</p>
                  )}
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className={`w-full bg-white border rounded-full py-3 pl-10 pr-4 text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none shadow-xs ${
                      fieldErrors.password_confirmation ? "border-rose-400" : "border-gray-300 focus:border-[#3087C5]"
                    }`}
                    placeholder="Confirm New Password"
                  />
                  {fieldErrors.password_confirmation && (
                    <p className="pl-4 pt-1 text-[11px] font-bold text-rose-600">
                      {fieldErrors.password_confirmation}
                    </p>
                  )}
                </div>

                <div className="pt-2">
                  <Button
                    variant="gold"
                    size="lg"
                    type="submit"
                    disabled={isResetting}
                    loading={isResetting}
                    className="w-full justify-center py-3 text-base font-extrabold shadow-md uppercase tracking-wider"
                  >
                    <span>{isResetting ? "Resetting…" : "Reset Password"}</span>
                  </Button>
                </div>
              </form>
            )
          ) : isSubmitted ? (
            <div className="bg-white/80 border border-emerald-300 rounded-2xl p-6 text-center space-y-3 shadow-sm">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="font-bold text-gray-900 text-lg">Check Your Email!</h3>
              <p className="text-xs text-gray-600">
                If an account matches <span className="font-bold">{emailOrPhone}</span>, a password reset link has
                been sent. Please check your inbox (and spam folder).
              </p>
              <button
                onClick={() => {
                  setIsSubmitted(false);
                  setEmailOrPhone("");
                }}
                className="text-xs font-bold text-[#3087C5] hover:underline pt-2 inline-block"
              >
                Try another email address
              </button>
            </div>
          ) : (
            <form onSubmit={handleRequestReset} className="space-y-5">
              {/* Email Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={emailOrPhone}
                  onChange={(event) => setEmailOrPhone(event.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-full py-3 pl-10 pr-4 text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#3087C5] shadow-xs"
                  placeholder="Email Address"
                />
              </div>

              {/* Send Reset Link Button */}
              <div className="pt-2">
                <Button
                  variant="gold"
                  size="lg"
                  type="submit"
                  disabled={isSubmitting}
                  loading={isSubmitting}
                  className="w-full justify-center py-3 text-base font-extrabold shadow-md uppercase tracking-wider"
                >
                  <span>{isSubmitting ? "Sending…" : "Send Reset Link"}</span>
                </Button>
              </div>
            </form>
          )}

          {/* Login Link Footer */}
          <p className="text-center text-xs font-semibold text-gray-600 pt-2">
            Remember your password?{" "}
            <Link to="/login" className="text-[#3087C5] font-black hover:underline">
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
