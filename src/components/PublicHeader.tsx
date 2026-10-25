import Link from "next/link";
import { schoolLoginPath } from "@/lib/login-path";

type PlatformProps = {
  variant?: "platform";
  schoolName?: never;
  schoolCode?: never;
};

type SchoolProps = {
  variant: "school";
  schoolName: string;
  schoolCode: string;
  audience?: "public" | "parent" | "staff";
  homeHref?: string;
};

export function PublicHeader(props: PlatformProps | SchoolProps) {
  if (props.variant === "school") {
    const audience = props.audience ?? "public";
    return (
      <header className="school-top mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href={props.homeHref ?? `/s/${props.schoolCode}`}>
          <p className="text-xs uppercase tracking-[0.24em] text-gold">Dugsi</p>
          <p className="font-[family-name:var(--font-fraunces)] text-2xl text-green">{props.schoolName}</p>
        </Link>
        {audience === "staff" ? null : (
          <nav className="flex flex-wrap gap-3">
            <Link href={`/enroll/${props.schoolCode}`} className="btn btn-primary">
              Enroll
            </Link>
            {audience === "public" ? (
              <>
                <Link href={schoolLoginPath("parent", props.schoolCode)} className="btn btn-ghost">
                  Parent
                </Link>
                <Link href={schoolLoginPath("teacher", props.schoolCode)} className="btn btn-ghost">
                  Teacher
                </Link>
                <Link href={schoolLoginPath("admin", props.schoolCode)} className="btn btn-ghost">
                  Admin
                </Link>
              </>
            ) : null}
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
        <Link href="/login" className="btn btn-ghost">
          Sign in
        </Link>
        <Link href="/register" className="btn btn-primary">
          Create
        </Link>
      </nav>
    </header>
  );
}
