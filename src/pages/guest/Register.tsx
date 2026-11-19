import { useState } from "react";
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
  Camera, 

} from "lucide-react";
import { Button } from "@/components/ui/button";
import logoImage from "@/assets/logo.webp";
import bgImage from "@/assets/bg-img1.webp";

export default function Register() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    address: "",
    birthday: "",
    password: "",
    confirmPassword: "",
  });

  const [idOne, setIdOne] = useState<File | null>(null);
  const [idTwo, setIdTwo] = useState<File | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();

    // 18+ Age Validation Check
    if (formData.birthday) {
      const birthDate = new Date(formData.birthday);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      if (age < 18) {
        alert("You must be at least 18 years old to register.");
        return;
      }
    }

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    console.log("Registering account with:", { ...formData, idOne, idTwo, agreeTerms });
    alert("Registration submitted successfully!");
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
              <span className="text-xl font-black tracking-widest uppercase text-sky-300">
                ONLINE MALL
              </span>
            </div>

            {/* Headline matching reference */}
            <div className="space-y-1">
              <h2 className="text-2xl sm:text-3xl font-black leading-tight text-white">
                Joint the mall family.
              </h2>
              <h2 className="text-2xl sm:text-3xl font-black leading-tight text-[#3087C5]">
                Start Shopping <span className="text-sky-400">Today.</span>
              </h2>
              <p className="text-xs text-gray-200 font-medium leading-relaxed pt-1">
                Discover your favorite products, check store availability, and order online. Then simply pay and claim at the mall.
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

          <div className="relative z-10 pt-6 text-[10px] font-semibold text-sky-200/70">
            © Online Mall Cordova
          </div>

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

          {/* Scrollable Form Body with Custom Scrollbar Styling */}
          <div className="my-3 overflow-y-auto pr-2 space-y-3.5 max-h-[380px]">
            
            {/* Profile Picture Uploader Preview */}
            <div className="flex items-center space-x-4 bg-white/80 p-3 rounded-2xl border border-gray-200 shadow-xs">
              <div className="w-12 h-12 rounded-full bg-sky-100 text-[#3087C5] flex items-center justify-center shrink-0 border-2 border-[#3087C5]/30 relative overflow-hidden">
                <User className="w-6 h-6" />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                  <Camera className="w-4 h-4 text-white" />
                </div>
              </div>
              <div>
                <p className="text-xs font-black text-gray-900">Insert Profile Picture</p>
                <p className="text-[11px] text-gray-500 font-medium">Click avatar to upload image</p>
              </div>
            </div>

            <form id="register-form" onSubmit={handleRegister} className="space-y-3.5">
              
              {/* Full Name */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-full py-2.5 pl-10 pr-4 text-xs sm:text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#3087C5] shadow-xs"
                  placeholder="Full name"
                />
              </div>

              {/* Email Address */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-full py-2.5 pl-10 pr-4 text-xs sm:text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#3087C5] shadow-xs"
                  placeholder="Email address"
                />
              </div>

              {/* Phone Number */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  required
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-full py-2.5 pl-10 pr-4 text-xs sm:text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#3087C5] shadow-xs"
                  placeholder="Phone Number"
                />
              </div>

              {/* Address */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <MapPin className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-full py-2.5 pl-10 pr-4 text-xs sm:text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#3087C5] shadow-xs"
                  placeholder="Address"
                />
              </div>

              {/* Birthday (18+ validation check) */}
              <div className="space-y-1">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    onFocus={(e) => (e.target.type = "date")}
                    onBlur={(e) => {
                      if (!e.target.value) e.target.type = "text";
                    }}
                    required
                    value={formData.birthday}
                    onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                    className="w-full bg-white border border-gray-300 rounded-full py-2.5 pl-10 pr-4 text-xs sm:text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#3087C5] shadow-xs"
                    placeholder="Birthday mm/dd/yy (Must be 18+)"
                  />
                </div>
                <p className="text-[10px] text-gray-500 pl-4 font-medium">*Must be 18 years or older to register.</p>
              </div>

              {/* ID 1 Upload Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <FileText className="w-4 h-4" />
                </div>
                <input
                  type="file"
                  accept="image/png, image/jpeg"
                  required
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setIdOne(e.target.files[0]);
                    }
                  }}
                  className="w-full bg-white border border-gray-300 rounded-full py-2 pl-10 pr-4 text-xs sm:text-sm font-medium text-gray-500 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-sky-50 file:text-[#3087C5] hover:file:bg-sky-100 focus:outline-none shadow-xs cursor-pointer"
                />
                <span className="absolute right-3.5 top-2.5 text-xs text-gray-400 pointer-events-none">ID 1 (PNG/JPG)</span>
              </div>

              {/* ID 2 Upload Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <FileText className="w-4 h-4" />
                </div>
                <input
                  type="file"
                  accept="image/png, image/jpeg"
                  required
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setIdTwo(e.target.files[0]);
                    }
                  }}
                  className="w-full bg-white border border-gray-300 rounded-full py-2 pl-10 pr-4 text-xs sm:text-sm font-medium text-gray-500 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-sky-50 file:text-[#3087C5] hover:file:bg-sky-100 focus:outline-none shadow-xs cursor-pointer"
                />
                <span className="absolute right-3.5 top-2.5 text-xs text-gray-400 pointer-events-none">ID 2 (PNG/JPG)</span>
              </div>

              {/* Password */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-full py-2.5 pl-10 pr-10 text-xs sm:text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#3087C5] shadow-xs"
                  placeholder="Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Confirm Password */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-full py-2.5 pl-10 pr-10 text-xs sm:text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#3087C5] shadow-xs"
                  placeholder="Confirm Password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Terms & Conditions Checkbox */}
              <div className="flex items-center space-x-2 text-xs font-bold pt-1">
                <label className="flex items-center space-x-2 cursor-pointer text-gray-700">
                  <input
                    type="checkbox"
                    required
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="w-4 h-4 text-[#3087C5] rounded border-gray-300 focus:ring-[#3087C5]"
                  />
                  <span className="text-[11px] sm:text-xs font-semibold">
                    Agree to the{" "}
                    <Link to="/terms" className="text-[#3087C5] hover:underline">Terms of Service</Link> &{" "}
                    <Link to="/privacy" className="text-[#3087C5] hover:underline">Privacy Policy</Link>
                  </span>
                </label>
              </div>

            </form>
          </div>

          {/* Footer Actions (Fixed at bottom of right panel) */}
          <div className="space-y-2 pt-2 border-t border-gray-200/60">
            <Button 
              form="register-form"
              variant="gold" 
              size="lg" 
              type="submit" 
              className="w-full justify-center py-2.5 text-sm sm:text-base font-extrabold shadow-md uppercase tracking-wider"
            >
              Sign Up Now
            </Button>

            <p className="text-center text-xs font-semibold text-gray-600">
              Already have an account?{" "}
              <Link to="/login" className="text-[#3087C5] font-black hover:underline">
                Login here
              </Link>
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}