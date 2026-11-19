import { useState } from "react";
import { useNavigate } from "react-router";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InlineSpinner } from "@/components/common/Feedback";
import { useAuth } from "@/context/AuthContext";
import { getErrorMessage } from "@/lib/api";
import { useToast } from "@/components/common/Toast";

type LogoutButtonProps = {
  variant?: "primary" | "secondary" | "gold" | "white" | "outline" | "danger";
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
};

/** Session-aware logout button used by the customer/worker/admin headers. */
export function LogoutButton({
  variant = "white",
  size = "md",
  className = "",
  label = "Logout",
}: LogoutButtonProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [pending, setPending] = useState(false);

  const handleClick = async () => {
    if (pending) return;
    setPending(true);
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not log out. Please try again."));
    } finally {
      setPending(false);
    }
  };

  return (
    <Button variant={variant} size={size} className={className} onClick={handleClick} disabled={pending}>
      {pending ? <InlineSpinner /> : <LogOut className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} />}
      <span>{pending ? "Logging out…" : label}</span>
    </Button>
  );
}
