export default function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
      {eyebrow && (
        <span className="font-(family-name:--font-display) text-xs italic tracking-[0.2em] text-(--color-signal)">
          {eyebrow}
        </span>
      )}
      <h2 className="text-3xl font-semibold text-(--color-ink) sm:text-4xl">
        {title}
      </h2>
      {description && (
        <p className="text-(--color-ink-muted)">{description}</p>
      )}
    </div>
  );
}
