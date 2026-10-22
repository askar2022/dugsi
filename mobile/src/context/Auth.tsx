import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, loadStoredSession, rememberSchool, setToken } from "@/lib/api";
import { isSchoolRole } from "@/lib/roles";

export type SchoolUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantName: string | null;
  tenantSlug: string | null;
};

type AuthContextValue = {
  user: SchoolUser | null;
  ready: boolean;
  schoolCode: string;
  setSchoolCode: (value: string) => void;
  login: (input: { schoolCode: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SchoolUser | null>(null);
  const [ready, setReady] = useState(false);
  const [schoolCode, setSchoolCode] = useState("");

  useEffect(() => {
    loadStoredSession()
      .then(async ({ token, school }) => {
        setSchoolCode(school);
        if (!token) return;
        const data = await api<{ user: SchoolUser }>("/api/auth/me");
        if (!isSchoolRole(data.user.role)) {
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
    const data = await api<{ token: string; user: SchoolUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        schoolCode: code,
        email: input.email.trim().toLowerCase(),
        password: input.password,
      }),
    });
    if (!isSchoolRole(data.user.role)) {
      setToken(null);
      throw new Error("This app is for this school’s parents, teachers, and office.");
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
