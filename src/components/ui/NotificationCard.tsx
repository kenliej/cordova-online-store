import { Megaphone, Package, Tag } from "lucide-react";
import type { NotificationItem } from "@/lib/types";
import { formatRelativeTime } from "@/lib/format";

export type { NotificationItem };

const CATEGORY_ICON = {
  "Offers & Sales": Tag,
  Order: Package,
  System: Megaphone,
} as const;

type NotificationCardProps = {
  notification: NotificationItem;
  onMarkRead?: (notification: NotificationItem) => void;
  markingRead?: boolean;
};

export function NotificationCard({ notification, onMarkRead, markingRead = false }: NotificationCardProps) {
  const Icon = CATEGORY_ICON[notification.category];
  const time = notification.time || formatRelativeTime(notification.createdAt);

  return (
    <div
      className={`border rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all duration-300 flex items-start space-x-4 ${
        notification.read ? "bg-white border-gray-200/80" : "bg-sky-50/60 border-sky-200"
      }`}
    >
      {/* Icon Box */}
      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-sky-50 text-[#3087C5] flex items-center justify-center shrink-0 border border-sky-100">
        <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
      </div>

      {/* Content Area */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1 gap-2">
          <h3 className="font-bold text-gray-900 text-sm sm:text-base truncate flex items-center gap-2">
            {!notification.read && <span className="w-2 h-2 rounded-full bg-[#D4A328] shrink-0" />}
            {notification.title}
          </h3>
          <span className="text-xs font-semibold text-gray-400 shrink-0">{time}</span>
        </div>
        <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed">{notification.description}</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-gray-500">
            {notification.category}
          </span>
          {!notification.read && onMarkRead && (
            <button
              type="button"
              onClick={() => onMarkRead(notification)}
              disabled={markingRead}
              className="text-[11px] font-bold text-[#3087C5] hover:underline disabled:opacity-50"
            >
              {markingRead ? "Marking…" : "Mark as read"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
