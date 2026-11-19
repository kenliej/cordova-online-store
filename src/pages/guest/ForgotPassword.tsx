import { useState } from "react";
import { Link } from "react-router";
import { 
  Mail, 
  ShoppingCart, 
  Store, 
  ShieldCheck, 
  MapPin, 
  CheckCircle2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import logoImage from "@/assets/logo.webp";
import bgImage from "@/assets/bg-img1.webp";

export default function ForgotPassword() {
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
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
              <span className="text-xl font-black tracking-widest uppercase text-sky-300">
                ONLINE MALL
              </span>
            </div>

            {/* Headline matching reference */}
            <div className="space-y-1">
              <h2 className="text-2xl sm:text-3xl font-black leading-tight text-white">
                Reset Your Password
              </h2>
              <h2 className="text-xl sm:text-2xl font-black leading-tight text-[#3087C5]">
                Quick regain access <span className="text-sky-400">to your account</span>
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

        {/* RIGHT PANEL: Forgot Password Form (7 cols) */}
        <div className="md:col-span-7 bg-[#EBE9E1]/60 p-6 sm:p-10 flex flex-col justify-center space-y-6">
          
          <div>
            <h1 className="text-3xl font-black text-[#1c4b6e] tracking-tight mb-1">
              Forgot Password?
            </h1>
            <p className="text-sm font-semibold text-gray-600">
              Enter the email address associated with your account, and we’ll send you a verification code to reset your password.
            </p>
          </div>

          {isSubmitted ? (
            <div className="bg-white/80 border border-emerald-300 rounded-2xl p-6 text-center space-y-3 shadow-sm">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="font-bold text-gray-900 text-lg">Verification Code Sent!</h3>
              <p className="text-xs text-gray-600">
                Please check your inbox or phone messages for instructions to reset your password.
              </p>
              <button
                onClick={() => setIsSubmitted(false)}
                className="text-xs font-bold text-[#3087C5] hover:underline pt-2 inline-block"
              >
                Try another email or phone number
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Email or Phone Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={emailOrPhone}
                  onChange={(e) => setEmailOrPhone(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-full py-3 pl-10 pr-4 text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#3087C5] shadow-xs"
                  placeholder="Email or Phone Number"
                />
              </div>

              {/* Send Code Button using custom gold variant */}
              <div className="pt-2">
                <Button 
                  variant="gold" 
                  size="lg" 
                  type="submit" 
                  className="w-full justify-center py-3 text-base font-extrabold shadow-md uppercase tracking-wider"
                >
                  send code
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