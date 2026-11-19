import { useState } from "react";
import { 
  Mail, 
  User, 
  Phone, 
  FileText, 
  MessageSquare, 
  Send, 
  MapPin, 
  Clock, 
  CheckCircle2,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function ContactUsSection1() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    subject: "",
    message: "",
  });

  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCaptchaVerified) {
      alert("Please verify that you are not a robot.");
      return;
    }

    setToastMessage("Your message has been sent successfully!");
    setTimeout(() => {
      setToastMessage(null);
      setFormData({ fullName: "", email: "", phoneNumber: "", subject: "", message: "" });
      setIsCaptchaVerified(false);
    }, 4000);
  };

  return (
    <section className="bg-[#EBE9E1] w-full py-12 px-4 sm:px-6 lg:px-12 relative font-sans">
      
      {/* Toast Notification Popup */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 border border-white/10 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-sm font-semibold">{toastMessage}</p>
        </div>
      )}

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Send Us a Message Form Card (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-[#3087C5]/40 rounded-3xl p-6 sm:p-8 shadow-md">
          
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#3087C5] flex items-center justify-center shadow-xs">
              <Mail className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-black text-[#3087C5] tracking-tight">
              Send Us a Message
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Full Name */}
            <div className="space-y-1">
              <label className="flex items-center space-x-1.5 text-xs font-black text-gray-900 uppercase">
                <User className="w-3.5 h-3.5 text-[#3087C5]" />
                <span>Full Name</span>
              </label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-[#3087C5]"
                placeholder="Enter your full name"
              />
            </div>

            {/* Email & Phone Number Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="flex items-center space-x-1.5 text-xs font-black text-gray-900 uppercase">
                  <Mail className="w-3.5 h-3.5 text-[#3087C5]" />
                  <span>Email</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-[#3087C5]"
                  placeholder="name@example.com"
                />
              </div>

              <div className="space-y-1">
                <label className="flex items-center space-x-1.5 text-xs font-black text-gray-900 uppercase">
                  <Phone className="w-3.5 h-3.5 text-[#3087C5]" />
                  <span>Phone Number</span>
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-[#3087C5]"
                  placeholder="09123456789"
                />
              </div>
            </div>

            {/* Subject */}
            <div className="space-y-1">
              <label className="flex items-center space-x-1.5 text-xs font-black text-gray-900 uppercase">
                <FileText className="w-3.5 h-3.5 text-[#3087C5]" />
                <span>Subject</span>
              </label>
              <input
                type="text"
                required
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-[#3087C5]"
                placeholder="What is this regarding?"
              />
            </div>

            {/* Message */}
            <div className="space-y-1">
              <label className="flex items-center space-x-1.5 text-xs font-black text-gray-900 uppercase">
                <MessageSquare className="w-3.5 h-3.5 text-[#3087C5]" />
                <span>Message</span>
              </label>
              <textarea
                rows={4}
                required
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full bg-white border border-gray-300 rounded-xl p-4 text-sm font-medium focus:outline-none focus:border-[#3087C5]"
                placeholder="Write your message here..."
              />
            </div>

            {/* Simulated reCAPTCHA Box with SVG refresh spinner */}
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between max-w-xs shadow-xs">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={isCaptchaVerified}
                  onChange={(e) => setIsCaptchaVerified(e.target.checked)}
                  className="w-5 h-5 text-[#3087C5] rounded border-gray-300 focus:ring-[#3087C5]"
                />
                <span className="text-xs font-bold text-gray-800">I'm not a robot</span>
              </label>
              <div className="flex flex-col items-center select-none">
                <RefreshCw className="w-5 h-5 text-sky-600 animate-spin" />
                <span className="text-[9px] font-bold text-gray-500 tracking-tighter mt-1">reCAPTCHA</span>
                <span className="text-[8px] text-gray-400">Privacy - Terms</span>
              </div>
            </div>

            {/* Submit Button using custom gold Button variant */}
            <div className="pt-2">
              <Button variant="gold" size="md" type="submit" className="px-6 py-2.5 font-bold shadow-md">
                <Send className="w-4 h-4 mr-2" />
                <span>Send Message</span>
              </Button>
            </div>

          </form>

        </div>

        {/* RIGHT COLUMN: Location, Embedded Map & Social Links Cards (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* 1. Mall Location Header Card */}
          <div className="relative h-48 rounded-3xl overflow-hidden shadow-md border border-gray-200 group">
            <img 
              src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80" 
              alt="Gaisano Grand Cordova Exterior" 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 flex items-center space-x-3 text-white">
              <div className="w-10 h-10 rounded-full bg-[#3087C5] flex items-center justify-center shrink-0 shadow">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-black text-base leading-tight">Our Mall Location</h3>
                <p className="text-xs text-gray-200 font-medium">Visit us at Gaisano Grand Cordova</p>
              </div>
            </div>
          </div>

          {/* 2. Embedded Google Map & Opening Hours Card */}
          <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-md space-y-4">
            
            {/* Live Gaisano Grand Cordova Google Map Frame */}
            <div className="w-full h-56 rounded-2xl overflow-hidden border border-gray-200 shadow-inner">
              <iframe
                title="Gaisano Grand Cordova Map"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3926.047109407119!2d123.94589537503447!3d10.257784389861033!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x33a99a5c18a2d331%3A0xfc813bbc6454dc7c!2sGaisano%20Grand%20Cordova!5e0!3m2!1sen!2sph!4v1793770120016!5m2!1sen!2sph"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>

            {/* Opening Hours */}
            <div className="flex items-center space-x-3 pt-2 pb-3 border-b border-gray-200">
              <div className="w-10 h-10 rounded-xl bg-[#3087C5] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-black text-gray-900 uppercase">Opening Hours</p>
                <p className="text-sm font-bold text-gray-600">8:00AM - 8:00PM</p>
              </div>
            </div>

            {/* Social Media SVG Brand Icons */}
            <div className="flex items-center justify-around pt-2 px-4">
              {/* Facebook SVG */}
              <a href="#facebook" className="w-10 h-10 rounded-full bg-[#3087C5] text-white flex items-center justify-center hover:scale-110 transition-transform shadow" aria-label="Facebook">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>

              {/* Instagram SVG */}
              <a href="#instagram" className="w-10 h-10 rounded-full bg-[#3087C5] text-white flex items-center justify-center hover:scale-110 transition-transform shadow" aria-label="Instagram">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>

              {/* TikTok SVG */}
              <a href="#tiktok" className="w-10 h-10 rounded-full bg-[#3087C5] text-white flex items-center justify-center hover:scale-110 transition-transform shadow" aria-label="TikTok">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.82.57-1.34 1.54-1.35 2.54.04 1.13.75 2.14 1.79 2.54 1.05.41 2.3.16 3.08-.62.62-.64.93-1.52.93-2.4.03-5.38.01-10.77.02-16.15z"/>
                </svg>
              </a>

              {/* YouTube SVG */}
              <a href="#youtube" className="w-10 h-10 rounded-full bg-[#3087C5] text-white flex items-center justify-center hover:scale-110 transition-transform shadow" aria-label="YouTube">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}