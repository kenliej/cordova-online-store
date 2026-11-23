import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  Lock,
  Eye,
  EyeOff,
  ShoppingCart,
  Store,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  ImagePlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { getErrorMessage, getFieldErrors, isApiError } from "@/lib/api";
import { isAtLeast18, formatDateInput } from "@/lib/format";
import logoImage from "@/assets/logo.webp";
import bgImage from "@/assets/bg-img1.webp";

type RegisterForm = {
  fullName: string;
  email: string;
  phoneNumber: string;
  address: string;
  birthday: string;
  gender: string;
  password: string;
  confirmPassword: string;
};

const EMPTY_FORM: RegisterForm = {
  fullName: "",
  email: "",
  phoneNumber: "",
  address: "",
  birthday: "",
  gender: "",
  password: "",
  confirmPassword: "",
};

export default function Register() {
  const { register } = useAuth();

  const [formData, setFormData] = useState<RegisterForm>(EMPTY_FORM);
  const [idOne, setIdOne] = useState<File | null>(null);
  const [idTwo, setIdTwo] = useState<File | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState("");

  // Object-URL preview lifecycle for the two ID images is handled by the
  // uploader inputs below; registration intentionally collects no profile photo
  // (a built-in default avatar is shown until the approved customer uploads one).

  const setField = (field: keyof RegisterForm, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      if (!Object.keys(current).length) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!isAtLeast18(formData.birthday)) errors.birthday = "You must be at least 18 years old to register.";
    if (formData.password !== formData.confirmPassword) {
      errors.password_confirmation = "Passwords do not match.";
    }
    if (formData.password.length < 12) {
      errors.password = "Password must be at least 12 characters long.";
    }
    if (!idOne) errors.id_front = "Please upload your first valid ID.";
    if (!idTwo) errors.id_back = "Please upload your second valid ID.";
    if (!agreeTerms) errors.agree_terms = "You must agree to the Terms of Service & Privacy Policy.";

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError(Object.values(errors)[0] ?? "Please review the highlighted fields.");
      return false;
    }
    return true;
  };

  const handleRegister = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (!validate()) return;
    if (!idOne || !idTwo) return;

    setIsSubmitting(true);
    try {
      const result = await register({
        name: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phoneNumber.trim(),
        address: formData.address.trim(),
        birthday: formData.birthday,
        gender: formData.gender.trim() || undefined,
        password: formData.password,
        passwordConfirmation: formData.confirmPassword,
        idFront: idOne,
        idBack: idTwo,
        agreeTerms,
      });
      setSuccessMessage(result.message);
    } catch (registerError) {
      if (isApiError(registerError) && registerError.isRateLimited) {
        setError("Too many registration attempts. Please wait a while and try again.");
      } else {
        const errors = getFieldErrors(registerError);
        if (Object.keys(errors).length > 0) {
          setFieldErrors(errors);
          setError("Please fix the highlighted fields and try again.");
        } else {
          setError(getErrorMessage(registerError, "Registration failed. Please try again."));
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldError = (field: string) => fieldErrors[field];
  const inputClass = (field: string) =>
    `w-full bg-white border rounded-full py-2.5 pl-10 pr-4 text-xs sm:text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none shadow-xs ${
      fieldError(field) ? "border-rose-400 focus:border-rose-500" : "border-gray-300 focus:border-[#3087C5]"
    }`;
  const maxBirthday = formatDateInput(new Date(new Date().setFullYear(new Date().getFullYear() - 18)));

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans">
      {/* Background Image with Fixed Parallax Effect & Overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-fixed z-0 filter blur-xs"
        style={{ backgroundImage: `url(${bgImage})` }}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      </div>

      {/* Main Register Modal Box */}
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
              <h2 className="text-2xl sm:text-3xl font-black leading-tight text-white">Join the mall family.</h2>
              <h2 className="text-2xl sm:text-3xl font-black leading-tight text-[#3087C5]">
                Start Shopping <span className="text-sky-400">Today.</span>
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
                  <p className="text-[10px] text-gray-300">Mall staff review every new account.</p>
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

        {/* RIGHT PANEL: Registration Form (7 cols) - Fixed Height Container */}
        <div className="md:col-span-7 bg-[#EBE9E1]/60 p-6 sm:p-8 flex flex-col justify-between md:h-[580px]">
          {/* Header (Fixed) */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#1c4b6e] tracking-tight mb-1">
              Create your Account
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-gray-600">
              Sign up to access exclusive member features (18+ only) & faster checkouts.
            </p>
          </div>

          {successMessage ? (
            <div className="my-3 flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-emerald-300 bg-white/80 p-8 text-center shadow-sm">
              <CheckCircle2 className="w-14 h-14 text-emerald-500" />
              <h3 className="text-lg font-black text-gray-900">Registration Submitted!</h3>
              <p className="text-xs sm:text-sm font-medium text-gray-600">
                {successMessage || "Your account is awaiting admin approval."}
              </p>
              <p className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-4 py-1.5">
                Your account is pending — mall staff will review your IDs before activation.
              </p>
              <Link to="/login" className="mt-2 w-full">
                <Button variant="gold" size="lg" className="w-full justify-center py-2.5 font-extrabold">
                  Go to Login
                </Button>
              </Link>
            </div>
          ) : (
            <>
              {/* Scrollable Form Body with Custom Scrollbar Styling */}
              <div className="my-3 overflow-y-auto pr-2 space-y-3.5 max-h-[380px]">
                {error && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-[11px] font-bold text-rose-800"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Profile photos are not collected at registration: the account
                    shows a default avatar until the customer changes it from
                    Profile after admin approval. */}

                <form id="register-form" onSubmit={handleRegister} className="space-y-3.5" noValidate>
                  {/* Full Name */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      autoComplete="name"
                      value={formData.fullName}
                      onChange={(event) => setField("fullName", event.target.value)}
                      className={inputClass("name")}
                      placeholder="Full name"
                    />
                  </div>
                  {fieldError("name") && (
                    <p className="-mt-2 pl-4 text-[11px] font-bold text-rose-600">{fieldError("name")}</p>
                  )}

                  {/* Email Address */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={formData.email}
                      onChange={(event) => setField("email", event.target.value)}
                      className={inputClass("email")}
                      placeholder="Email address"
                    />
                  </div>
                  {fieldError("email") && (
                    <p className="-mt-2 pl-4 text-[11px] font-bold text-rose-600">{fieldError("email")}</p>
                  )}

                  {/* Phone Number */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      required
                      autoComplete="tel"
                      value={formData.phoneNumber}
                      onChange={(event) => setField("phoneNumber", event.target.value)}
                      className={inputClass("phone")}
                      placeholder="Phone Number"
                    />
                  </div>
                  {fieldError("phone") && (
                    <p className="-mt-2 pl-4 text-[11px] font-bold text-rose-600">{fieldError("phone")}</p>
                  )}

                  {/* Address */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      autoComplete="street-address"
                      value={formData.address}
                      onChange={(event) => setField("address", event.target.value)}
                      className={inputClass("address")}
                      placeholder="Address"
                    />
                  </div>
                  {fieldError("address") && (
                    <p className="-mt-2 pl-4 text-[11px] font-bold text-rose-600">{fieldError("address")}</p>
                  )}

                  {/* Gender (optional) */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <User className="w-4 h-4" />
                    </div>
                    <select
                      value={formData.gender}
                      onChange={(event) => setField("gender", event.target.value)}
                      className={`${inputClass("gender")} pr-8 appearance-none`}
                      aria-label="Gender (optional)"
                    >
                      <option value="">Gender (optional)</option>
                      <option value="Real Men">Real Men</option>
                      <option value="Gender Neutral">Gender Neutral</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>

                  {/* Birthday (18+ validation check) */}
                  <div className="space-y-1">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <input
                        type="date"
                        required
                        max={maxBirthday}
                        value={formData.birthday}
                        onChange={(event) => setField("birthday", event.target.value)}
                        className={inputClass("birthday")}
                        aria-label="Birthday (must be 18+)"
                      />
                    </div>
                    <p className="text-[10px] text-gray-500 pl-4 font-medium">*Must be 18 years or older to register.</p>
                    {fieldError("birthday") && (
                      <p className="pl-4 text-[11px] font-bold text-rose-600">{fieldError("birthday")}</p>
                    )}
                  </div>

                  {/* ID 1 Upload Input */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <FileText className="w-4 h-4" />
                    </div>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      required
                      onChange={(event) => {
                        setIdOne(event.target.files?.[0] ?? null);
                        setFieldErrors((current) => {
                          const next = { ...current };
                          delete next.id_front;
                          return next;
                        });
                      }}
                      className="w-full bg-white border border-gray-300 rounded-full py-2 pl-10 pr-4 text-xs sm:text-sm font-medium text-gray-500 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-sky-50 file:text-[#3087C5] hover:file:bg-sky-100 focus:outline-none shadow-xs cursor-pointer"
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs text-gray-400 pointer-events-none">
                      ID 1 (PNG/JPG)
                    </span>
                  </div>
                  {fieldError("id_front") && (
                    <p className="-mt-2 pl-4 text-[11px] font-bold text-rose-600">{fieldError("id_front")}</p>
                  )}

                  {/* ID 2 Upload Input */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <FileText className="w-4 h-4" />
                    </div>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      required
                      onChange={(event) => {
                        setIdTwo(event.target.files?.[0] ?? null);
                        setFieldErrors((current) => {
                          const next = { ...current };
                          delete next.id_back;
                          return next;
                        });
                      }}
                      className="w-full bg-white border border-gray-300 rounded-full py-2 pl-10 pr-4 text-xs sm:text-sm font-medium text-gray-500 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-sky-50 file:text-[#3087C5] hover:file:bg-sky-100 focus:outline-none shadow-xs cursor-pointer"
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs text-gray-400 pointer-events-none">
                      ID 2 (PNG/JPG)
                    </span>
                  </div>
                  {fieldError("id_back") && (
                    <p className="-mt-2 pl-4 text-[11px] font-bold text-rose-600">{fieldError("id_back")}</p>
                  )}

                  {/* Password */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="new-password"
                      value={formData.password}
                      onChange={(event) => setField("password", event.target.value)}
                      className={`${inputClass("password")} pr-10`}
                      placeholder="Password (min 12 chars, letters + numbers, mixed case)"
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
                  {fieldError("password") && (
                    <p className="-mt-2 pl-4 text-[11px] font-bold text-rose-600">{fieldError("password")}</p>
                  )}

                  {/* Confirm Password */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      autoComplete="new-password"
                      value={formData.confirmPassword}
                      onChange={(event) => setField("confirmPassword", event.target.value)}
                      className={`${inputClass("password_confirmation")} pr-10`}
                      placeholder="Confirm Password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldError("password_confirmation") && (
                    <p className="-mt-2 pl-4 text-[11px] font-bold text-rose-600">
                      {fieldError("password_confirmation")}
                    </p>
                  )}

                  {/* Terms & Conditions Checkbox */}
                  <div className="flex items-center space-x-2 text-xs font-bold pt-1">
                    <label className="flex items-center space-x-2 cursor-pointer text-gray-700">
                      <input
                        type="checkbox"
                        required
                        checked={agreeTerms}
                        onChange={(event) => setAgreeTerms(event.target.checked)}
                        className="w-4 h-4 text-[#3087C5] rounded border-gray-300 focus:ring-[#3087C5]"
                      />
                      <span className="text-[11px] sm:text-xs font-semibold">
                        Agree to the{" "}
                        <Link to="/terms" className="text-[#3087C5] hover:underline">
                          Terms of Service
                        </Link>{" "}
                        &{" "}
                        <Link to="/privacy" className="text-[#3087C5] hover:underline">
                          Privacy Policy
                        </Link>
                      </span>
                    </label>
                  </div>
                  {fieldError("agree_terms") && (
                    <p className="pl-4 text-[11px] font-bold text-rose-600">{fieldError("agree_terms")}</p>
                  )}
                </form>
              </div>

              {/* Footer Actions (Fixed at bottom of right panel) */}
              <div className="space-y-2 pt-2 border-t border-gray-200/60">
                <Button
                  form="register-form"
                  variant="gold"
                  size="lg"
                  type="submit"
                  disabled={isSubmitting}
                  loading={isSubmitting}
                  className="w-full justify-center py-2.5 text-sm sm:text-base font-extrabold shadow-md uppercase tracking-wider"
                >
                  {!isSubmitting && <ImagePlus className="w-4 h-4" />}
                  <span>{isSubmitting ? "Submitting…" : "Sign Up Now"}</span>
                </Button>

                <p className="text-center text-xs font-semibold text-gray-600">
                  Already have an account?{" "}
                  <Link to="/login" className="text-[#3087C5] font-black hover:underline">
                    Login here
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
