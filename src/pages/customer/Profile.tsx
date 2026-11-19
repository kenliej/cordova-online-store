import { useState } from "react";
import { 
  User, 
  Lock, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin, 
  SlidersHorizontal,
  ChevronUp,
  ChevronDown,
  ShoppingCart,
  CheckCircle2,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<"Profile" | "Change Password">("Profile");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Profile Form State
  const [profileData, setProfileData] = useState({
    fullName: "Sherwyn James Misula",
    email: "Sherwynn.Misula@gmail.com",
    phone: "0911324567",
    gender: "Real Men",
    birthday: "09/11/1995",
    address: "North Korea",
  });

  // Change Password Form State
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setToastMessage("Profile updated successfully!");
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handlePasswordUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert("New passwords do not match!");
      return;
    }
    setToastMessage("Password changed successfully!");
    setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const navTabs = [
    { name: "Profile", icon: User },
    { name: "Change Password", icon: Lock },
  ];

  return (
    <section className="bg-[#EBE9E1] w-full min-h-[85vh] py-10 px-4 sm:px-6 relative font-sans">
      
      {/* Toast Notification Popup */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 border border-white/10 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-sm font-semibold">{toastMessage}</p>
        </div>
      )}

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 items-start">
        
        {/* SIDEBAR FILTERS / NAVIGATION (#E3DFD3 unified background container) */}
        <aside className="w-full lg:w-85 shrink-0 bg-[#E3DFD3] border border-gray-300/80 rounded-2xl p-5 shadow-sm space-y-6">
          
          <div>
            {/* Collapsible Header */}
            <div 
              className="flex items-center justify-between cursor-pointer pb-3"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#3087C5] text-white flex items-center justify-center shadow-xs">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <h3 className="font-black text-gray-900 text-base">Account Settings</h3>
              </div>
              <button className="text-gray-600 hover:text-gray-900">
                {isSidebarOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>

            {/* Navigation Tab List with rounded-none and space-y-0 */}
            {isSidebarOpen && (
              <div className="mt-2 space-y-0 border-t border-gray-300/60 overflow-hidden">
                {navTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isSelected = activeTab === tab.name;
                  return (
                    <button
                      key={tab.name}
                      onClick={() => setActiveTab(tab.name as any)}
                      className={`w-full flex items-center justify-between px-3.5 py-3 text-xs sm:text-sm font-bold transition-all rounded-none ${
                        isSelected 
                          ? "bg-white text-gray-900 border-l-4 border-[#3087C5] shadow-xs" 
                          : "bg-white/40 text-gray-700 hover:bg-white/70 border-l-4 border-transparent"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="w-4 h-4 text-[#3087C5]" />
                        <span className="truncate text-left">{tab.name}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

        </aside>

        {/* CONTENT AREA */}
        <div className="flex-1 w-full">
          
          {activeTab === "Profile" ? (
            /* TAB 1: PROFILE DETAILS */
            <div className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-200 shadow-md space-y-8">
              
              <div className="flex flex-col sm:flex-row items-center sm:items-center justify-between gap-4 border-b border-gray-200 pb-6">
                <h2 className="text-2xl sm:text-3xl font-black text-[#3087C5] tracking-tight">
                  Profile Details
                </h2>
                <Button 
                  variant="primary" 
                  size="md"
                  onClick={handleProfileUpdate}
                  className="rounded-full shadow-md"
                >
                  <ShoppingCart className="w-4 h-4 mr-1.5" />
                  <span>Edit Profile</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Avatar Column */}
                <div className="lg:col-span-4 flex flex-col items-center justify-center">
                  <div className="w-40 h-40 rounded-full p-1.5 bg-white shadow-xl border border-gray-200 overflow-hidden">
                    <img 
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80" 
                      alt="Profile Avatar" 
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>
                </div>

                {/* Profile Fields Column */}
                <div className="lg:col-span-8 space-y-4">
                  
                  {/* Full Name */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#3087C5]">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={profileData.fullName}
                      onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                      className="w-full bg-white border border-gray-300 rounded-full py-3 pl-10 pr-4 text-sm font-bold text-gray-800 focus:outline-none focus:border-[#3087C5] shadow-xs"
                      placeholder="Full Name"
                    />
                  </div>

                  {/* Email & Phone Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#3087C5]">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                        className="w-full bg-white border border-gray-300 rounded-full py-3 pl-10 pr-4 text-sm font-medium text-gray-800 focus:outline-none focus:border-[#3087C5] shadow-xs"
                        placeholder="Email Address"
                      />
                    </div>

                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#3087C5]">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        type="tel"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                        className="w-full bg-white border border-gray-300 rounded-full py-3 pl-10 pr-4 text-sm font-medium text-gray-800 focus:outline-none focus:border-[#3087C5] shadow-xs"
                        placeholder="Phone Number"
                      />
                    </div>
                  </div>

                  {/* Gender & Birthday Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#3087C5]">
                        <Users className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={profileData.gender}
                        onChange={(e) => setProfileData({ ...profileData, gender: e.target.value })}
                        className="w-full bg-white border border-gray-300 rounded-full py-3 pl-10 pr-4 text-sm font-medium text-gray-800 focus:outline-none focus:border-[#3087C5] shadow-xs"
                        placeholder="Gender"
                      />
                    </div>

                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#3087C5]">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={profileData.birthday}
                        onChange={(e) => setProfileData({ ...profileData, birthday: e.target.value })}
                        className="w-full bg-white border border-gray-300 rounded-full py-3 pl-10 pr-4 text-sm font-medium text-gray-800 focus:outline-none focus:border-[#3087C5] shadow-xs"
                        placeholder="Birthday mm/dd/yyyy"
                      />
                    </div>
                  </div>

                  {/* Address */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#3087C5]">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={profileData.address}
                      onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                      className="w-full bg-white border border-gray-300 rounded-full py-3 pl-10 pr-4 text-sm font-medium text-gray-800 focus:outline-none focus:border-[#3087C5] shadow-xs"
                      placeholder="Address"
                    />
                  </div>

                </div>

              </div>

            </div>
          ) : (
            /* TAB 2: CHANGE PASSWORD */
            <div className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-200 shadow-md space-y-6">
              
              <div className="border-b border-gray-200 pb-4">
                <h2 className="text-2xl sm:text-3xl font-black text-[#3087C5] tracking-tight">
                  Change Password
                </h2>
              </div>

              <form onSubmit={handlePasswordUpdate} className="space-y-4 max-w-xl">
                
                {/* Current Password */}
                <div className="space-y-1">
                  <input
                    type="password"
                    required
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="w-full bg-white border border-gray-300 rounded-full py-3 px-5 text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#3087C5] shadow-xs"
                    placeholder="Current Password"
                  />
                </div>

                {/* New Password */}
                <div className="space-y-1">
                  <input
                    type="password"
                    required
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="w-full bg-white border border-gray-300 rounded-full py-3 px-5 text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#3087C5] shadow-xs"
                    placeholder="New Password"
                  />
                </div>

                {/* Confirm Password */}
                <div className="space-y-1">
                  <input
                    type="password"
                    required
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="w-full bg-white border border-gray-300 rounded-full py-3 px-5 text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#3087C5] shadow-xs"
                    placeholder="Confirm Password"
                  />
                </div>

                {/* Submit Button using custom Button variant */}
                <div className="pt-2">
                  <Button 
                    variant="primary" 
                    size="md" 
                    type="submit" 
                    className="rounded-full px-6 py-2.5 shadow-md font-bold"
                  >
                    Change Password
                  </Button>
                </div>

              </form>

            </div>
          )}

        </div>

      </div>
    </section>
  );
}