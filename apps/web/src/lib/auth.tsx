import type { AuthLoginInput, AuthLoginResponse, AuthUser } from "@andre/shared";
import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import { API_BASE_URL, ApiError } from "@/lib/http";

const STORAGE_KEY = "beneficiarios-session";

type SessionState = {
  token: string;
  user: AuthUser;
};

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (input: AuthLoginInput) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchJson<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: "Erro inesperado." }));
    throw new ApiError(body.message ?? "Erro inesperado.", response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

function readStoredSession(): SessionState | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (parsed && typeof parsed.token === "string" && parsed.user) {
      return parsed as SessionState;
    }
    return null;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<SessionState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const parsed = readStoredSession();
    if (!parsed) {
      setLoading(false);
      return;
    }

    fetchJson<{ user: AuthUser }>("/auth/me", {}, parsed.token)
      .then((result) => {
        startTransition(() => {
          setSession({ token: parsed.token, user: result.user });
        });
      })
      .catch(() => {
        window.localStorage.removeItem(STORAGE_KEY);
      })
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user: session?.user ?? null,
    token: session?.token ?? null,
    loading,
    async login(input) {
      const result = await fetchJson<AuthLoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(input),
      });

      const nextSession = { token: result.accessToken, user: result.user };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
      setSession(nextSession);
    },
    async logout() {
      const currentToken = session?.token;
      if (currentToken) {
        await fetchJson("/auth/logout", { method: "POST" }, currentToken).catch(() => undefined);
      }
      window.localStorage.removeItem(STORAGE_KEY);
      setSession(null);
    },
  }), [loading, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
