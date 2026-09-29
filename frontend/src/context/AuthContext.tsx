import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiGet, apiPost } from "../services/api";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "investigator" | "reviewer" | "legal_officer" | "auditor" | string;
  badge_number?: string | null;
  department?: string | null;
  is_active: boolean;
  created_at?: string | null;
  last_login?: string | null;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  hasRole: (allowedRoles: string[]) => boolean;
  isAdmin: boolean;
  isInvestigator: boolean;
  isReviewer: boolean;
  isAuditor: boolean;
  isLegalOfficer: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "ncrb_auth_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState<boolean>(true);

  // Validate stored session on mount
  useEffect(() => {
    let isMounted = true;
    const initAuth = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (!storedToken) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const currentUser = await apiGet<AuthUser>("/api/auth/me");
        if (isMounted) {
          setUser(currentUser);
          setToken(storedToken);
        }
      } catch {
        if (isMounted) {
          localStorage.removeItem(TOKEN_KEY);
          setUser(null);
          setToken(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void initAuth();

    // Listen for unauthorized 401 events from api service
    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
      localStorage.removeItem(TOKEN_KEY);
    };
    window.addEventListener("ncrb:unauthorized", handleUnauthorized);

    return () => {
      isMounted = false;
      window.removeEventListener("ncrb:unauthorized", handleUnauthorized);
    };
  }, []);

  const login = async (email: string, password: string): Promise<AuthUser> => {
    // Authenticate with email & password. Role is strictly assigned by backend.
    const res = await apiPost<TokenResponse>("/api/auth/login", {
      email: email.trim().toLowerCase(),
      password,
    });

    localStorage.setItem(TOKEN_KEY, res.access_token);
    setToken(res.access_token);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    try {
      void apiPost("/api/auth/logout");
    } catch {
      // Best-effort cleanup
    }
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  const hasRole = (allowedRoles: string[]): boolean => {
    if (!user) return false;
    const r = (user.role || "").toLowerCase();
    if (r === "admin") return true; // Superuser privileges
    return allowedRoles.map((x) => x.toLowerCase()).includes(r);
  };

  const role = (user?.role || "").toLowerCase();
  const isAdmin = role === "admin";
  const isInvestigator = role === "investigator" || role === "admin";
  const isReviewer = role === "reviewer" || role === "admin";
  const isAuditor = role === "auditor" || role === "admin";
  const isLegalOfficer = role === "legal_officer" || role === "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        hasRole,
        isAdmin,
        isInvestigator,
        isReviewer,
        isAuditor,
        isLegalOfficer,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
