import Link from "next/link";
import { schoolLoginPath } from "@/lib/login-path";

type PlatformProps = {
  variant?: "platform";
  schoolName?: never;
  schoolCode?: never;
};

type SchoolDoor = "parent" | "teacher" | "admin";

type SchoolProps = {
  variant: "school";
  schoolName: string;
  schoolCode: string;
  audience?: "public" | "parent" | "staff" | "login";
  loginPortal?: SchoolDoor;
  homeHref?: string;
};

const SCHOOL_DOORS: { portal: SchoolDoor; label: string }[] = [
  { portal: "parent", label: "Parent" },
  { portal: "teacher", label: "Teacher" },
  { portal: "admin", label: "Office" },
];

function schoolDoorLinks(schoolCode: string, current?: SchoolDoor) {
  return SCHOOL_DOORS.map((door) => (
    <Link
      key={door.portal}
      href={schoolLoginPath(door.portal, schoolCode)}
      className={current === door.portal ? "btn btn-primary" : "btn btn-ghost"}
    >
      {door.label}
    </Link>
  ));
}

export function PublicHeader(props: PlatformProps | SchoolProps) {
  if (props.variant === "school") {
    const audience = props.audience ?? "public";
    return (
      <header className="school-top mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href={props.homeHref ?? `/s/${props.schoolCode}`}>
          <p className="text-xs uppercase tracking-[0.24em] text-gold">Dugsi</p>
          <p className="font-[family-name:var(--font-fraunces)] text-2xl text-green">{props.schoolName}</p>
        </Link>
        {audience === "staff" ? null : audience === "login" ? (
          <nav className="flex flex-wrap gap-3">{schoolDoorLinks(props.schoolCode, props.loginPortal)}</nav>
        ) : (
          <nav className="flex flex-wrap gap-3">
            <Link href={`/enroll/${props.schoolCode}`} className="btn btn-primary">
              Enroll
            </Link>
            {audience === "public" ? schoolDoorLinks(props.schoolCode) : null}
          </nav>
        )}
      </header>
    );
  }

  return (
    <header className="school-top mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
      <Link href="/">
        <p className="text-xs uppercase tracking-[0.24em] text-gold">OurDugsi</p>
        <p className="font-[family-name:var(--font-fraunces)] text-2xl text-green">Dugsi</p>
      </Link>
      <nav className="flex flex-wrap gap-3">
        <Link href="/signin" className="btn btn-ghost">
          School sign in
        </Link>
        <Link href="/login" className="btn btn-ghost">
          Super admin
        </Link>
        <Link href="/register" className="btn btn-primary">
          Create
        </Link>
      </nav>
    </header>
  );
}
