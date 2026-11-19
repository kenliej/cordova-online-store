import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell,
  Tag,
  Package,
  Megaphone,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  X,
  CheckCheck,
} from "lucide-react";
import { NotificationCard } from "@/components/ui/NotificationCard";
import { EmptyState, ErrorBanner, InlineSpinner, ListSkeleton } from "@/components/common/Feedback";
import { useToast } from "@/components/common/Toast";
import {
  fetchNotifications,
  getErrorMessage,
  markAllNotificationsRead,
  markNotificationRead,
  notificationCategoryForApi,
} from "@/lib/api";
import type { NotificationCounts, NotificationItem } from "@/lib/types";

type CategoryFilter = "All" | "Offers & Sales" | "Order" | "System";

const CATEGORIES: { name: CategoryFilter; icon: typeof Bell; countKey: keyof NotificationCounts | null }[] = [
  { name: "All", icon: Bell, countKey: "all" },
  { name: "Offers & Sales", icon: Tag, countKey: "offers" },
  { name: "Order", icon: Package, countKey: "order" },
  { name: "System", icon: Megaphone, countKey: "system" },
];

export function NotificationsSection1() {
  const toast = useToast();
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("All");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [counts, setCounts] = useState<NotificationCounts>({ all: 0, offers: 0, order: 0, system: 0 });
  const [unread, setUnread] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [markingIds, setMarkingIds] = useState<number[]>([]);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(true);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce the search box into the server query.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearchQuery(searchInput.trim()), 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await fetchNotifications({
        category: selectedCategory === "All" ? undefined : notificationCategoryForApi(selectedCategory),
        search: searchQuery || undefined,
      });
      setNotifications(data.items);
      setCounts(data.counts);
      setUnread(data.unread);
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Could not load your notifications. Please try again."));
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedCategory]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const handleMarkRead = async (notification: NotificationItem) => {
    if (notification.read || markingIds.includes(notification.id)) return;
    setMarkingIds((current) => [...current, notification.id]);
    // Optimistic: reflect immediately, roll back on failure.
    setNotifications((current) =>
      current.map((item) => (item.id === notification.id ? { ...item, read: true } : item)),
    );
    setUnread((current) => Math.max(0, current - 1));
    try {
      await markNotificationRead(notification.id);
    } catch (markError) {
      setNotifications((current) =>
        current.map((item) => (item.id === notification.id ? { ...item, read: false } : item)),
      );
      setUnread((current) => current + 1);
      toast.error(getErrorMessage(markError, "Could not mark the notification as read."));
    } finally {
      setMarkingIds((current) => current.filter((id) => id !== notification.id));
    }
  };

  const handleMarkAllRead = async () => {
    if (isMarkingAll || unread === 0) return;
    setIsMarkingAll(true);
    try {
      await markAllNotificationsRead();
      setNotifications((current) => current.map((item) => ({ ...item, read: true })));
      setUnread(0);
      setCounts((current) => ({ ...current }));
      toast.success("All notifications marked as read.");
    } catch (markError) {
      toast.error(getErrorMessage(markError, "Could not mark all notifications as read."));
    } finally {
      setIsMarkingAll(false);
    }
  };

  const clearFilters = () => {
    setSelectedCategory("All");
    setSearchInput("");
    setSearchQuery("");
  };

  const hasFilters = selectedCategory !== "All" || searchQuery.length > 0;

  return (
    <section className="bg-[#EBE9E1] w-full py-10 px-4 sm:px-6 relative">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 items-start">
        {/* MOBILE FILTER BUTTON */}
        <div className="w-full lg:hidden">
          <button
            onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
            className="w-full bg-[#3087C5] text-white py-3 px-5 rounded-2xl font-bold flex items-center justify-center space-x-2 shadow-md hover:bg-[#256fa4] transition-colors"
          >
            <Filter className="w-5 h-5" />
            <span>{isMobileFilterOpen ? "Hide Notifications Center" : "Notifications Center"}</span>
          </button>
        </div>

        {/* SIDEBAR FILTERS */}
        <aside
          className={`w-full lg:w-85 shrink-0 bg-[#E3DFD3] border border-gray-300/80 rounded-2xl p-5 shadow-sm space-y-6 ${
            isMobileFilterOpen ? "block" : "hidden lg:block"
          }`}
        >
          <div>
            {/* Collapsible Header */}
            <div
              className="flex items-center justify-between cursor-pointer pb-3"
              onClick={() => setIsCategoryOpen(!isCategoryOpen)}
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#3087C5] text-white flex items-center justify-center shadow-xs">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <h3 className="font-black text-gray-900 text-base">Notifications Center</h3>
              </div>
              <button className="text-gray-600 hover:text-gray-900" aria-label="Toggle notification categories">
                {isCategoryOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>

            {isCategoryOpen && (
              <div className="mt-2 space-y-0 border-t border-gray-300/60 max-h-[380px] overflow-y-auto">
                {CATEGORIES.map((category) => {
                  const Icon = category.icon;
                  const isSelected = selectedCategory === category.name;
                  const count = category.countKey ? counts[category.countKey] : 0;
                  return (
                    <button
                      key={category.name}
                      onClick={() => {
                        setSelectedCategory(category.name);
                        setIsMobileFilterOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 text-xs sm:text-sm font-bold transition-all rounded-none ${
                        isSelected
                          ? "bg-white text-gray-900 border-l-4 border-[#3087C5] shadow-xs"
                          : "bg-white/40 text-gray-700 hover:bg-white/70 border-l-4 border-transparent"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="w-4 h-4 text-[#3087C5]" />
                        <span className="truncate text-left">{category.name}</span>
                      </div>
                      <span className="text-xs font-semibold text-gray-500 bg-gray-200/60 px-2 py-0.5 rounded-full shrink-0">
                        ({count})
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Unread summary + mark all */}
            <div className="mt-4 border-t border-gray-300/60 pt-4 space-y-2">
              <p className="text-xs font-bold text-gray-600">
                Unread: <span className="text-[#3087C5] font-black">{unread}</span>
              </p>
              <button
                type="button"
                onClick={() => void handleMarkAllRead()}
                disabled={unread === 0 || isMarkingAll}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#3087C5] px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-40 hover:bg-[#256fa4] transition-colors"
              >
                {isMarkingAll ? <InlineSpinner className="w-3 h-3" /> : <CheckCheck className="w-3.5 h-3.5" />}
                <span>{isMarkingAll ? "Marking…" : "Mark all as read"}</span>
              </button>
            </div>
          </div>
        </aside>

        {/* NOTIFICATIONS FEED RESULTS */}
        <div className="flex-1 w-full space-y-5">
          {/* Header & Search Bar */}
          <div className="bg-white/60 backdrop-blur-xs p-4 rounded-2xl border border-gray-300/60 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <h2 className="text-lg font-black text-gray-900">
              Recent Notifications
              {unread > 0 && (
                <span className="ml-2 inline-flex items-center rounded-full bg-[#D4A328] px-2 py-0.5 text-[10px] font-black text-white align-middle">
                  {unread} unread
                </span>
              )}
            </h2>

            {/* Search Bar */}
            <div className="relative w-full sm:w-80 flex items-center">
              <input
                type="text"
                placeholder="Search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                className="w-full bg-white border border-gray-300 rounded-full py-2 pl-4 pr-12 text-sm font-medium focus:outline-none focus:border-[#3087C5]"
              />
              <button
                type="button"
                onClick={() => setSearchQuery(searchInput.trim())}
                className="absolute right-1 bg-[#3087C5] text-white p-2 rounded-full hover:bg-[#256fa4] transition-colors"
                aria-label="Search notifications"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Reset Filter prompt if searching or filtering */}
          {hasFilters && (
            <div className="flex items-center justify-between bg-white/40 px-4 py-2 rounded-xl text-xs font-bold text-gray-600">
              <span>
                Showing filtered notifications ({notifications.length})
                {searchQuery && <span className="text-gray-500"> for “{searchQuery}”</span>}
              </span>
              <button
                onClick={clearFilters}
                className="text-[#3087C5] hover:underline flex items-center space-x-1"
              >
                <span>Clear Filters</span>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Loading / Error / Empty / List */}
          {isLoading && <ListSkeleton count={3} />}
          {!isLoading && error && <ErrorBanner message={error} onRetry={() => void loadNotifications()} />}
          {!isLoading && !error && notifications.length === 0 && (
            <EmptyState
              icon={<Bell className="w-12 h-12" />}
              title="No notifications found"
              description="Try checking another category or clearing your search."
              action={
                hasFilters ? (
                  <button
                    onClick={clearFilters}
                    className="bg-[#3087C5] text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-[#256fa4] transition-colors"
                  >
                    Reset View
                  </button>
                ) : undefined
              }
            />
          )}
          {!isLoading && !error && notifications.length > 0 && (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  onMarkRead={(item) => void handleMarkRead(item)}
                  markingRead={markingIds.includes(notification.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
