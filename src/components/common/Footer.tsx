import { MapPin } from "lucide-react";
import logoImage from "@/assets/logo.webp";

// Custom Facebook Icon
function FacebookIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

// Custom YouTube Icon
function YoutubeIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" />
    </svg>
  );
}

// Custom Instagram Icon
function InstagramIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg 
      className={className} 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      viewBox="0 0 24 24"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

// Custom TikTok Icon
function TiktokIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 3 15.57 6.33 6.33 0 0 0 9.33 22a6.33 6.33 0 0 0 6.33-6.33V9.05a8.16 8.16 0 0 0 4.93 1.63V7.23a4.85 4.85 0 0 1-1-.54z" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="w-full bg-gradient-to-t from-[#12395a] via-[#216194] to-[#3087C5] text-white font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-6">
        
        {/* Main Footer Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 items-center pb-8">
          
          {/* 1. Brand Logo & Title (Logo turned pure white using CSS filters) */}
          <div className="flex items-center space-x-3 justify-center sm:justify-start">
            <img 
              src={logoImage} 
              alt="Online Mall Logo" 
              className="w-16 h-16 sm:w-20 sm:h-20 object-contain brightness-0 invert drop-shadow-[0_2px_8px_rgba(255,255,255,0.3)]" 
            />
            <div className="flex flex-col">
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase leading-none">
                Online Mall
              </span>
              <span className="text-xs tracking-widest text-sky-200 font-bold uppercase mt-1">
                Cordova
              </span>
            </div>
          </div>

          {/* 2. Visit us (Map Thumbnail) */}
          <div className="flex flex-col items-center sm:items-start space-y-2">
            <h3 className="text-sm font-bold tracking-wide text-gray-100 uppercase">
              Visit us
            </h3>
            <a 
              href="https://maps.google.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="relative group rounded-2xl overflow-hidden border-2 border-white/30 hover:border-amber-300 transition-all shadow-md w-44 h-20 bg-sky-900/40 flex items-center justify-center"
            >
              <div className="absolute inset-0 bg-cover bg-center opacity-80 group-hover:scale-105 transition-transform duration-500" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=400&auto=format&fit=crop&q=80')` }} />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
              <div className="relative z-10 flex items-center space-x-1.5 bg-sky-800/90 text-white px-2.5 py-1 rounded-full text-xs font-semibold shadow">
                <MapPin className="w-3.5 h-3.5 text-red-400" />
                <span>Cordova, Cebu</span>
              </div>
            </a>
          </div>

          {/* 3. Follow us (Social Media Icons) */}
          <div className="flex flex-col items-center sm:items-start space-y-2">
            <h3 className="text-sm font-bold tracking-wide text-gray-100 uppercase">
              Follow us
            </h3>
            <div className="flex items-center space-x-2.5">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-white text-[#216194] hover:bg-amber-400 hover:text-gray-900 flex items-center justify-center transition-all shadow hover:scale-110"
                aria-label="Facebook"
              >
                <FacebookIcon className="w-5 h-5" />
              </a>

              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-white text-[#216194] hover:bg-amber-400 hover:text-gray-900 flex items-center justify-center transition-all shadow hover:scale-110"
                aria-label="YouTube"
              >
                <YoutubeIcon className="w-5 h-5" />
              </a>

              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-white text-[#216194] hover:bg-amber-400 hover:text-gray-900 flex items-center justify-center transition-all shadow hover:scale-110"
                aria-label="Instagram"
              >
                <InstagramIcon className="w-5 h-5" />
              </a>

              <a
                href="https://tiktok.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-white text-[#216194] hover:bg-amber-400 hover:text-gray-900 flex items-center justify-center transition-all shadow hover:scale-110"
                aria-label="TikTok"
              >
                <TiktokIcon className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* 4. Tagline */}
          <div className="text-center sm:text-right flex flex-col justify-center">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight drop-shadow-sm">
              Shop Smarter.
            </h2>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-sky-200 leading-tight drop-shadow-sm">
              Pick Up Safer.
            </h2>
          </div>

        </div>

        {/* Divider Line */}
        <div className="w-full border-t border-white/20 my-2" />

        {/* Bottom Copyright Text */}
        <div className="pt-4 text-center text-xs sm:text-sm text-gray-200/90 font-medium tracking-wide">
          <p>
            {new Date().getFullYear()} © Online Mall Cordova. All rights reserved | Web Designed for Capstone
          </p>
        </div>

      </div>
    </footer>
  );
}