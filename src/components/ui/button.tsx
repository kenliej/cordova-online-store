import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "gold" | "white" | "outline" | "danger";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  // Color variants tailored to your OnlineMall prototype designs
  const variants = {
    // Standard Action Button (e.g. Add to Cart)
    primary: "bg-[#3087C5] text-white hover:bg-[#256fa4] active:scale-[0.98]",
    
    // Gold Accent Button (e.g. Header Login, Active Nav Tabs)
    gold: "bg-[#D4A328] text-white hover:bg-[#b88c20] active:scale-[0.98]",
    
    // Light / White Pill Button (e.g. Header Register)
    white: "bg-white text-gray-900 hover:bg-gray-100 shadow-sm border border-gray-100 active:scale-[0.98]",
    
    // Secondary Pill with Border
    secondary: "bg-white text-sky-700 border border-sky-600 hover:bg-sky-50 active:scale-[0.98]",
    
    // Outline style for secondary actions
    outline: "bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-100 active:scale-[0.98]",
    
    // Destructive actions (e.g., Cancel Order, Reject Account)
    danger: "bg-red-600 text-white hover:bg-red-700 active:scale-[0.98]",
  };

  // Size variations
  const sizes = {
    sm: "px-3 py-1 text-xs gap-1.5",
    md: "px-5 py-2 text-sm gap-2",
    lg: "px-6 py-3 text-base gap-2.5",
  };

  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center font-semibold rounded-full cursor-pointer transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
