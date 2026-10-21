export function SchoolPlaceholder({
  name,
  message,
}: {
  name?: string | null;
  message?: string;
}) {
  const initial = name?.trim().charAt(0).toUpperCase() || "D";
  return (
    <div className="school-placeholder">
      <span className="school-placeholder-mark">{initial}</span>
      <p className="school-placeholder-copy">
        {message ?? "Add a school photo in Settings to welcome families here."}
      </p>
    </div>
  );
}

export function SchoolImage({
  src,
  name,
  alt,
  message,
}: {
  src?: string | null;
  name?: string | null;
  alt?: string;
  message?: string;
}) {
  if (!src) return <SchoolPlaceholder name={name} message={message} />;
  return <img className="school-photo" src={src} alt={alt ?? ""} />;
}
