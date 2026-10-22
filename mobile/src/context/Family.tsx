import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import { type ParentChild } from "@/lib/family";

type FamilyContextValue = {
  children: ParentChild[];
  child: ParentChild | null;
  childId: string | null;
  ready: boolean;
  selectChild: (id: string) => void;
  reload: () => Promise<ParentChild[]>;
};

const FamilyContext = createContext<FamilyContextValue | null>(null);

export function FamilyProvider({ children: tree }: { children: ReactNode }) {
  const [children, setChildren] = useState<ParentChild[]>([]);
  const [childId, setChildId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    const data = await api<{ students: ParentChild[] }>("/api/students");
    const list = data.students ?? [];
    setChildren(list);
    setChildId((current) => list.find((child) => child.id === current)?.id ?? list[0]?.id ?? null);
    return list;
  }, []);

  useEffect(() => {
    reload()
      .catch(() => setChildren([]))
      .finally(() => setReady(true));
  }, [reload]);

  const child = useMemo(
    () => children.find((item) => item.id === childId) ?? null,
    [childId, children],
  );

  return (
    <FamilyContext.Provider value={{ children, child, childId, ready, selectChild: setChildId, reload }}>
      {tree}
    </FamilyContext.Provider>
  );
}

export function useFamily() {
  const value = useContext(FamilyContext);
  if (!value) throw new Error("Family is missing.");
  return value;
}
