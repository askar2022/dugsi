import Link from "next/link";

type PlatformProps = {
  variant?: "platform";
  schoolName?: never;
  schoolCode?: never;
};

type SchoolProps = {
  variant: "school";
  schoolName: string;
  schoolCode: string;
};

export function PublicHeader(props: PlatformProps | SchoolProps) {
  if (props.variant === "school") {
    return (
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href={`/s/${props.schoolCode}`}>
          <p className="text-xs uppercase tracking-[0.24em] text-gold">Dugsi</p>
          <p className="font-[family-name:var(--font-fraunces)] text-2xl text-green">{props.schoolName}</p>
        </Link>
        <nav className="flex flex-wrap gap-3">
          <Link href={`/enroll/${props.schoolCode}`} className="btn btn-primary">
            Enroll your child
          </Link>
          <Link href={`/login?school=${props.schoolCode}`} className="btn btn-ghost">
            Sign in
          </Link>
        </nav>
      </header>
    );
  }

  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
      <Link href="/">
        <p className="text-xs uppercase tracking-[0.24em] text-gold">Our Dugsi</p>
        <p className="font-[family-name:var(--font-fraunces)] text-2xl text-green">Dugsi</p>
      </Link>
      <nav className="flex flex-wrap gap-3">
        <Link href="/login" className="btn btn-ghost">
          School sign in
        </Link>
        <Link href="/register" className="btn btn-primary">
          Create a dugsi
        </Link>
      </nav>
    </header>
  );
}
