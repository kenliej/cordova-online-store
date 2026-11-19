import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
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
  Save,
  Camera,
  Users,
  AlertCircle,
  BadgeCheck,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorBanner, InlineSpinner, LoadingState } from "@/components/common/Feedback";
import { useToast } from "@/components/common/Toast";
import { useAuth } from "@/context/AuthContext";
import {
  changePassword,
  fetchProfile,
  getErrorMessage,
  getFieldErrors,
  updateProfile,
  uploadAvatar,
} from "@/lib/api";
import { formatDate, formatDateInput, initials, isAtLeast18 } from "@/lib/format";
import type { ProfileData } from "@/lib/types";

type Tab = "Profile" | "Change Password";

const EMPTY_PASSWORD_FORM = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<Tab>("Profile");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [profileForm, setProfileForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    gender: "",
    birthday: "",
    address: "",
  });
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const [passwordForm, setPasswordForm] = useState(EMPTY_PASSWORD_FORM);
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const data = await fetchProfile();
      setProfile(data);
      setUser(data.user);
      setProfileForm({
        fullName: data.user.name,
        email: data.user.email,
        phone: data.user.phone ?? "",
        gender: data.user.gender ?? "",
        birthday: formatDateInput(data.user.birthday),
        address: data.user.address ?? "",
      });
    } catch (error) {
      setLoadError(getErrorMessage(error, "Could not load your profile. Please try again."));
    } finally {
      setIsLoading(false);
    }
  }, [setUser]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const setProfileField = (field: keyof typeof profileForm, value: string) => {
    setProfileForm((current) => ({ ...current, [field]: value }));
    setProfileErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Profile photo must be 2MB or smaller.");
      return;
    }
    setIsUploadingAvatar(true);
    try {
      const updatedUser = await uploadAvatar(file);
      setUser(updatedUser);
      setProfile((current) => (current ? { ...current, user: updatedUser } : current));
      toast.success("Profile photo updated successfully!");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not upload your profile photo."));
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleProfileUpdate = async (event: FormEvent) => {
    event.preventDefault();
    setProfileErrors({});

    if (profileForm.birthday && !isAtLeast18(profileForm.birthday)) {
      setProfileErrors({ birthday: "You must be at least 18 years old." });
      return;
    }

    setIsSavingProfile(true);
    try {
      const updatedUser = await updateProfile({
        name: profileForm.fullName.trim(),
        phone: profileForm.phone.trim(),
        address: profileForm.address.trim(),
        gender: profileForm.gender.trim() || null,
        birthday: profileForm.birthday || null,
      });
      setUser(updatedUser);
      setProfile((current) => (current ? { ...current, user: updatedUser } : current));
      toast.success("Profile updated successfully!");
    } catch (error) {
      const errors = getFieldErrors(error);
      if (Object.keys(errors).length > 0) setProfileErrors(errors);
      else toast.error(getErrorMessage(error, "Could not update your profile."));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordUpdate = async (event: FormEvent) => {
    event.preventDefault();
    setPasswordErrors({});

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordErrors({ password_confirmation: "New passwords do not match." });
      return;
    }

    setIsChangingPassword(true);
    try {
      const message = await changePassword({
        currentPassword: passwordForm.currentPassword,
        password: passwordForm.newPassword,
        passwordConfirmation: passwordForm.confirmPassword,
      });
      toast.success(message || "Password changed successfully!");
      setPasswordForm(EMPTY_PASSWORD_FORM);
    } catch (error) {
      const errors = getFieldErrors(error);
      if (Object.keys(errors).length > 0) setPasswordErrors(errors);
      else toast.error(getErrorMessage(error, "Could not change your password."));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const navTabs: { name: Tab; icon: typeof User }[] = [
    { name: "Profile", icon: User },
    { name: "Change Password", icon: Lock },
  ];

  const currentUser = profile?.user ?? user;
  const avatar = currentUser?.profilePhoto ?? "";
  const profileError = (field: string) => profileErrors[field];

  return (
    <section className="bg-[#EBE9E1] w-full min-h-[85vh] py-10 px-4 sm:px-6 relative font-sans">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 items-start">
        {/* SIDEBAR NAVIGATION (#E3DFD3 unified background container) */}
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
              <button className="text-gray-600 hover:text-gray-900" aria-label="Toggle account settings menu">
                {isSidebarOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>

            {isSidebarOpen && (
              <div className="mt-2 space-y-0 border-t border-gray-300/60 overflow-hidden">
                {navTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isSelected = activeTab === tab.name;
                  return (
                    <button
                      key={tab.name}
                      onClick={() => setActiveTab(tab.name)}
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

            {/* Account summary */}
            {currentUser && (
              <div className="mt-4 space-y-1.5 border-t border-gray-300/60 pt-4 text-[11px] font-bold text-gray-600">
                {currentUser.customerNo && (
                  <p className="flex items-center gap-1.5">
                    <BadgeCheck className="w-3.5 h-3.5 text-[#3087C5]" /> Customer ID: {currentUser.customerNo}
                  </p>
                )}
                <p className="flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600" /> Bad records: {currentUser.badRecords}/2
                </p>
              </div>
            )}
          </div>
        </aside>

        {/* CONTENT AREA */}
        <div className="flex-1 w-full">
          {isLoading && <LoadingState label="Loading your profile…" />}
          {!isLoading && loadError && <ErrorBanner message={loadError} onRetry={() => void loadProfile()} />}

          {!isLoading && !loadError && activeTab === "Profile" && (
            <div className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-200 shadow-md space-y-8">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-200 pb-6">
                <h2 className="text-2xl sm:text-3xl font-black text-[#3087C5] tracking-tight">Profile Details</h2>
                <Button
                  variant="primary"
                  size="md"
                  type="submit"
                  form="profile-form"
                  disabled={isSavingProfile}
                  loading={isSavingProfile}
                  className="rounded-full shadow-md"
                >
                  {!isSavingProfile && <Save className="w-4 h-4 mr-1.5" />}
                  <span>{isSavingProfile ? "Saving…" : "Save Profile"}</span>
                </Button>
              </div>

              <form id="profile-form" onSubmit={handleProfileUpdate} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Avatar Column */}
                <div className="lg:col-span-4 flex flex-col items-center justify-center gap-3">
                  <div className="relative w-40 h-40 rounded-full p-1.5 bg-white shadow-xl border border-gray-200 overflow-hidden">
                    {avatar ? (
                      <img src={avatar} alt="Profile Avatar" className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <div className="w-full h-full rounded-full bg-[#3087C5] text-white flex items-center justify-center text-4xl font-black">
                        {initials(currentUser?.name)}
                      </div>
                    )}
                    {isUploadingAvatar && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white">
                        <InlineSpinner className="w-7 h-7" />
                      </div>
                    )}
                  </div>

                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(event) => void handleAvatarChange(event)}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="rounded-full"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Change Photo</span>
                  </Button>
                  <p className="text-[10px] font-semibold text-gray-400 text-center">
                    PNG/JPG/WebP, max 2MB.
                    <br />
                    {profile?.idDocuments.frontUploaded && profile?.idDocuments.backUploaded
                      ? "Your submitted IDs are verified on file."
                      : "Both ID documents are required for approval."}
                  </p>
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
                      required
                      value={profileForm.fullName}
                      onChange={(event) => setProfileField("fullName", event.target.value)}
                      className={`w-full bg-white border rounded-full py-3 pl-10 pr-4 text-sm font-bold text-gray-800 focus:outline-none shadow-xs ${
                        profileError("name") ? "border-rose-400" : "border-gray-300 focus:border-[#3087C5]"
                      }`}
                      placeholder="Full Name"
                    />
                    {profileError("name") && (
                      <p className="pl-4 pt-1 text-[11px] font-bold text-rose-600">{profileError("name")}</p>
                    )}
                  </div>

                  {/* Email (read-only — contact support to change) & Phone Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#3087C5]">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        value={profileForm.email}
                        readOnly
                        title="Email address cannot be changed here"
                        className="w-full bg-gray-50 border border-gray-200 rounded-full py-3 pl-10 pr-4 text-sm font-medium text-gray-500 focus:outline-none shadow-xs cursor-not-allowed"
                        placeholder="Email Address"
                      />
                    </div>

                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#3087C5]">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        type="tel"
                        value={profileForm.phone}
                        onChange={(event) => setProfileField("phone", event.target.value)}
                        className={`w-full bg-white border rounded-full py-3 pl-10 pr-4 text-sm font-medium text-gray-800 focus:outline-none shadow-xs ${
                          profileError("phone") ? "border-rose-400" : "border-gray-300 focus:border-[#3087C5]"
                        }`}
                        placeholder="Phone Number"
                      />
                      {profileError("phone") && (
                        <p className="pl-4 pt-1 text-[11px] font-bold text-rose-600">{profileError("phone")}</p>
                      )}
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
                        value={profileForm.gender}
                        onChange={(event) => setProfileField("gender", event.target.value)}
                        className={`w-full bg-white border rounded-full py-3 pl-10 pr-4 text-sm font-medium text-gray-800 focus:outline-none shadow-xs ${
                          profileError("gender") ? "border-rose-400" : "border-gray-300 focus:border-[#3087C5]"
                        }`}
                        placeholder="Gender"
                      />
                      {profileError("gender") && (
                        <p className="pl-4 pt-1 text-[11px] font-bold text-rose-600">{profileError("gender")}</p>
                      )}
                    </div>

                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#3087C5]">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <input
                        type="date"
                        value={profileForm.birthday}
                        onChange={(event) => setProfileField("birthday", event.target.value)}
                        className={`w-full bg-white border rounded-full py-3 pl-10 pr-4 text-sm font-medium text-gray-800 focus:outline-none shadow-xs ${
                          profileError("birthday") ? "border-rose-400" : "border-gray-300 focus:border-[#3087C5]"
                        }`}
                      />
                      <p className="pl-4 pt-1 text-[10px] font-semibold text-gray-400">
                        {profileForm.birthday ? `Displayed as ${formatDate(profileForm.birthday)}` : "Must be 18+"}
                      </p>
                      {profileError("birthday") && (
                        <p className="pl-4 pt-1 text-[11px] font-bold text-rose-600">{profileError("birthday")}</p>
                      )}
                    </div>
                  </div>

                  {/* Address */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#3087C5]">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={profileForm.address}
                      onChange={(event) => setProfileField("address", event.target.value)}
                      className={`w-full bg-white border rounded-full py-3 pl-10 pr-4 text-sm font-medium text-gray-800 focus:outline-none shadow-xs ${
                        profileError("address") ? "border-rose-400" : "border-gray-300 focus:border-[#3087C5]"
                      }`}
                      placeholder="Address"
                    />
                    {profileError("address") && (
                      <p className="pl-4 pt-1 text-[11px] font-bold text-rose-600">{profileError("address")}</p>
                    )}
                  </div>

                  <p className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400">
                    <AlertCircle className="w-3 h-3" />
                    Your email address is locked; contact mall support to change it.
                  </p>
                </div>
              </form>
            </div>
          )}

          {!isLoading && !loadError && activeTab === "Change Password" && (
            <div className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-200 shadow-md space-y-6">
              <div className="border-b border-gray-200 pb-4">
                <h2 className="text-2xl sm:text-3xl font-black text-[#3087C5] tracking-tight">Change Password</h2>
              </div>

              <form onSubmit={handlePasswordUpdate} className="space-y-4 max-w-xl">
                {/* Current Password */}
                <div className="space-y-1">
                  <input
                    type="password"
                    required
                    value={passwordForm.currentPassword}
                    onChange={(event) =>
                      setPasswordForm({ ...passwordForm, currentPassword: event.target.value })
                    }
                    className={`w-full bg-white border rounded-full py-3 px-5 text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none shadow-xs ${
                      passwordErrors.current_password ? "border-rose-400" : "border-gray-300 focus:border-[#3087C5]"
                    }`}
                    placeholder="Current Password"
                  />
                  {passwordErrors.current_password && (
                    <p className="pl-4 text-[11px] font-bold text-rose-600">{passwordErrors.current_password}</p>
                  )}
                </div>

                {/* New Password */}
                <div className="space-y-1">
                  <input
                    type="password"
                    required
                    value={passwordForm.newPassword}
                    onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })}
                    className={`w-full bg-white border rounded-full py-3 px-5 text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none shadow-xs ${
                      passwordErrors.password ? "border-rose-400" : "border-gray-300 focus:border-[#3087C5]"
                    }`}
                    placeholder="New Password (min 12 chars, letters + numbers, mixed case)"
                  />
                  {passwordErrors.password && (
                    <p className="pl-4 text-[11px] font-bold text-rose-600">{passwordErrors.password}</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-1">
                  <input
                    type="password"
                    required
                    value={passwordForm.confirmPassword}
                    onChange={(event) =>
                      setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })
                    }
                    className={`w-full bg-white border rounded-full py-3 px-5 text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none shadow-xs ${
                      passwordErrors.password_confirmation
                        ? "border-rose-400"
                        : "border-gray-300 focus:border-[#3087C5]"
                    }`}
                    placeholder="Confirm Password"
                  />
                  {passwordErrors.password_confirmation && (
                    <p className="pl-4 text-[11px] font-bold text-rose-600">
                      {passwordErrors.password_confirmation}
                    </p>
                  )}
                </div>

                <div className="pt-2">
                  <Button
                    variant="primary"
                    size="md"
                    type="submit"
                    disabled={isChangingPassword}
                    loading={isChangingPassword}
                    className="rounded-full px-6 py-2.5 shadow-md font-bold"
                  >
                    <span>{isChangingPassword ? "Saving…" : "Change Password"}</span>
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
