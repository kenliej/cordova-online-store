import type { ReactNode } from "react";

export type NotificationItem = {
  id: number;
  title: string;
  description: string;
  category: "Offers & Sales" | "Order" | "System";
  time: string;
  icon: ReactNode;
};

type NotificationCardProps = {
  notification: NotificationItem;
};

export function NotificationCard({ notification }: NotificationCardProps) {
  return (
    <div className="bg-white border border-gray-200/80 hover:border-[#3087C5] rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all duration-300 flex items-start space-x-4">
      
      {/* Icon Box */}
      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-sky-50 text-[#3087C5] flex items-center justify-center shrink-0 border border-sky-100">
        {notification.icon}
      </div>

      {/* Content Area */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-gray-900 text-sm sm:text-base truncate">
            {notification.title}
          </h3>
          <span className="text-xs font-semibold text-gray-400 shrink-0 ml-2">
            {notification.time}
          </span>
        </div>
        <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed">
          {notification.description}
        </p>
      </div>

    </div>
  );
}