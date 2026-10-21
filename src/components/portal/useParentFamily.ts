"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { normalizeParentChild, type ParentChild } from "@/lib/parent-family";

const STORAGE_KEY = "ourdugsi.parent.childId";

export function useParentFamily() {
  const [children, setChildren] = useState<ParentChild[]>([]);
  const [childId, setChildId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  async function reload() {
    const data = await api<{ students: Array<Parameters<typeof normalizeParentChild>[0]> }>("/api/students");
    const list = data.students.map(normalizeParentChild);
    setChildren(list);
    const fromUrl = new URLSearchParams(window.location.search).get("child");
    const fromStore = window.sessionStorage.getItem(STORAGE_KEY);
    const next =
      list.find((child) => child.id === fromUrl)?.id ??
      list.find((child) => child.id === fromStore)?.id ??
      list[0]?.id ??
      null;
    setChildId(next);
    if (next) window.sessionStorage.setItem(STORAGE_KEY, next);
    return list;
  }

  useEffect(() => {
    reload().catch(() => undefined).finally(() => setReady(true));
  }, []);

  function selectChild(id: string) {
    setChildId(id);
    window.sessionStorage.setItem(STORAGE_KEY, id);
    const url = new URL(window.location.href);
    url.searchParams.set("child", id);
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }

  const child = useMemo(
    () => children.find((item) => item.id === childId) ?? null,
    [childId, children],
  );

  return { children, child, childId, selectChild, ready, reload };
}
