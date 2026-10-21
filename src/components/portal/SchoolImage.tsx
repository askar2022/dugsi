export function SchoolPlaceholder({
  name,
  message,
  tone = "school",
}: {
  name?: string | null;
  message?: string;
  tone?: "school" | "classroom";
}) {
  const initial = name?.trim().charAt(0).toUpperCase() || "D";
  return (
    <div className={`school-placeholder${tone === "classroom" ? " is-classroom" : ""}`}>
      <span className="school-placeholder-mark">{initial}</span>
      <p className="school-placeholder-copy">
        {message ?? (tone === "classroom" ? name || "Your classroom" : "Add a school photo in Settings to welcome families here.")}
      </p>
    </div>
  );
}

export function SchoolImage({
  src,
  name,
  alt,
  message,
  tone = "school",
}: {
  src?: string | null;
  name?: string | null;
  alt?: string;
  message?: string;
  tone?: "school" | "classroom";
}) {
  if (!src) return <SchoolPlaceholder name={name} message={message} tone={tone} />;
  return <img className="school-photo" src={src} alt={alt ?? name ?? ""} />;
}
