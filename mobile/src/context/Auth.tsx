import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, loadStoredSession, rememberSchool, setToken } from "@/lib/api";

export type ParentUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantName: string | null;
  tenantSlug: string | null;
};

type AuthContextValue = {
  user: ParentUser | null;
  ready: boolean;
  schoolCode: string;
  setSchoolCode: (value: string) => void;
  login: (input: { schoolCode: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ParentUser | null>(null);
  const [ready, setReady] = useState(false);
  const [schoolCode, setSchoolCode] = useState("");

  useEffect(() => {
    loadStoredSession()
      .then(async ({ token, school }) => {
        setSchoolCode(school);
        if (!token) return;
        const data = await api<{ user: ParentUser }>("/api/auth/me");
        if (data.user.role !== "PARENT") {
          setToken(null);
          return;
        }
        setUser(data.user);
      })
      .catch(() => setToken(null))
      .finally(() => setReady(true));
  }, []);

  async function login(input: { schoolCode: string; email: string; password: string }) {
    const code = input.schoolCode.trim().toLowerCase();
    const data = await api<{ token: string; user: ParentUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        schoolCode: code,
        email: input.email.trim().toLowerCase(),
        password: input.password,
        portal: "parent",
      }),
    });
    if (data.user.role !== "PARENT") {
      setToken(null);
      throw new Error("This app is for parents. Use the school website for Teacher or Admin.");
    }
    setToken(data.token);
    rememberSchool(code);
    setSchoolCode(code);
    setUser(data.user);
  }

  function logout() {
    setToken(null);
    setUser(null);
    api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
  }

  return (
    <AuthContext.Provider value={{ user, ready, schoolCode, setSchoolCode, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("Auth is missing.");
  return value;
}
