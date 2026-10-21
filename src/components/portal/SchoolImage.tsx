export function SchoolPlaceholder({ name }: { name?: string | null }) {
  const initial = name?.trim().charAt(0).toUpperCase() || "D";
  return (
    <div className="school-placeholder">
      <span className="school-placeholder-mark">{initial}</span>
      <p className="school-placeholder-copy">Add a school photo in Settings to welcome families here.</p>
    </div>
  );
}

export function SchoolImage({
  src,
  name,
  alt,
}: {
  src?: string | null;
  name?: string | null;
  alt?: string;
}) {
  if (!src) return <SchoolPlaceholder name={name} />;
  return <img className="school-photo" src={src} alt={alt ?? ""} />;
}
