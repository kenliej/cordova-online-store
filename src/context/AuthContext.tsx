import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  fetchCart,
  fetchMe,
  login as apiLogin,
  logout as apiLogout,
  registerAccount,
  setUnauthorizedHandler,
} from "@/lib/api";
import type { AuthUser, LoginPayload, RegisterPayload, RegisterResult, Role } from "@/lib/types";

/** Landing route for each authenticated role. */
export function roleHomePath(role: Role): string {
  switch (role) {
    case "admin":
      return "/admin/accounts";
    case "worker":
      return "/worker/orders";
    case "customer":
      return "/";
    default:
      return "/login";
  }
}

interface AuthContextValue {
  /** `null` when unauthenticated (or still bootstrapping — check `loading`). */
  user: AuthUser | null;
  /** True while the initial `GET /api/auth/me` request is in flight. */
  loading: boolean;
  /** Total quantity in the customer's cart (0 for other roles/guests). */
  cartCount: number;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<AuthUser>;
  logout: () => Promise<void>;
  register: (payload: RegisterPayload) => Promise<RegisterResult>;
  /** Re-reads the session (used after profile mutations). */
  refresh: () => Promise<AuthUser | null>;
  /** Applies a user returned by a profile endpoint. */
  setUser: (user: AuthUser | null) => void;
  refreshCartCount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);

  const setUser = useCallback((nextUser: AuthUser | null) => {
    setUserState(nextUser);
    if (!nextUser || nextUser.role !== "customer") {
      setCartCount(0);
    }
  }, []);

  const refreshCartCount = useCallback(async () => {
    // Guests/workers/admins have no cart endpoints; fail silently.
    try {
      const cart = await fetchCart();
      setCartCount(cart.summary.itemCount);
    } catch {
      setCartCount(0);
    }
  }, []);

  // Bootstraps the session from the Sanctum cookie (single source of truth).
  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const me = await fetchMe();
        if (cancelled) return;
        setUser(me);
        if (me.role === "customer") {
          try {
            const cart = await fetchCart();
            if (!cancelled) setCartCount(cart.summary.itemCount);
          } catch {
            /* cart is optional during bootstrap */
          }
        }
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [setUser]);

  // Any 401 from the API drops the local session; route guards then redirect.
  useEffect(() => {
    const unsubscribe = setUnauthorizedHandler(() => setUser(null));
    return unsubscribe;
  }, [setUser]);

  const login = useCallback(
    async (payload: LoginPayload) => {
      const loggedIn = await apiLogin(payload);
      setUser(loggedIn);
      if (loggedIn.role === "customer") {
        try {
          const cart = await fetchCart();
          setCartCount(cart.summary.itemCount);
        } catch {
          setCartCount(0);
        }
      }
      return loggedIn;
    },
    [setUser],
  );

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      setUser(null);
    }
  }, [setUser]);

  const register = useCallback((payload: RegisterPayload) => registerAccount(payload), []);

  const refresh = useCallback(async () => {
    try {
      const me = await fetchMe();
      setUser(me);
      if (me.role === "customer") await refreshCartCount();
      return me;
    } catch {
      setUser(null);
      return null;
    }
  }, [refreshCartCount, setUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      cartCount,
      isAuthenticated: user !== null,
      login,
      logout,
      register,
      refresh,
      setUser,
      refreshCartCount,
    }),
    [user, loading, cartCount, login, logout, register, refresh, setUser, refreshCartCount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside an <AuthProvider>.");
  return context;
}
