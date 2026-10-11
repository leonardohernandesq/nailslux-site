export function SectionHeading({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div data-reveal-group className="mx-auto mb-10 max-w-2xl text-center sm:mb-14">
      <p className="text-sm font-bold tracking-[0.18em] text-accent uppercase">{eyebrow}</p>
      <h2
        id={id}
        className="font-display mt-2 text-4xl font-semibold tracking-tight focus:outline-none sm:text-5xl"
      >
        {title}
      </h2>
      <div
        aria-hidden="true"
        data-reveal-bar
        className="bg-gradient-brand mx-auto mt-4 h-1 w-16 rounded-full"
      />
      {children && (
        <p className="mt-4 text-lg text-ink-muted">
          {children}
        </p>
      )}
    </div>
  );
}
