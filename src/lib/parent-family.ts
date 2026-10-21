export type ParentChildClass = {
  id: string;
  name: string;
  level: string | null;
  dayOfWeek: string | null;
  startTime: string | null;
  endTime: string | null;
};

export type ParentChild = {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
  classId: string | null;
  class: ParentChildClass | null;
};

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export function childName(child: Pick<ParentChild, "firstName" | "lastName">) {
  return `${child.firstName} ${child.lastName}`.trim();
}

export function normalizeParentChild(raw: {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
  classId?: string | null;
  class?: ParentChildClass | ParentChildClass[] | null;
}): ParentChild {
  const klass = one(raw.class);
  return {
    id: raw.id,
    firstName: raw.firstName,
    lastName: raw.lastName,
    status: raw.status,
    classId: raw.classId ?? klass?.id ?? null,
    class: klass
      ? {
          id: klass.id,
          name: klass.name,
          level: klass.level ?? null,
          dayOfWeek: klass.dayOfWeek ?? null,
          startTime: klass.startTime ?? null,
          endTime: klass.endTime ?? null,
        }
      : null,
  };
}
