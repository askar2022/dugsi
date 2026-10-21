export function PageHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div>
      <h1 className="font-display text-3xl text-green md:text-4xl">{title}</h1>
      {description ? <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted">{description}</p> : null}
    </div>
  );
}
