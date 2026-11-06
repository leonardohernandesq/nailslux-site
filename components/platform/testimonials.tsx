// Real quotes only, with the studio's permission. The section stays hidden
// while this list is empty.
export const TESTIMONIALS: { quote: string; name: string; studio: string; slug: string }[] = [];

export function Testimonials() {
  return (
    <ul data-reveal-group className="grid gap-6 md:grid-cols-2">
      {TESTIMONIALS.map(({ quote, name, studio, slug }) => (
        <li key={slug}>
          <figure className="gold-ring relative flex h-full flex-col justify-between rounded-[2rem] bg-cream/5 p-8">
            <span aria-hidden="true" className="font-luxe text-7xl leading-none text-gold">
              “
            </span>
            <blockquote className="font-luxe -mt-4 text-2xl leading-snug italic sm:text-3xl">{quote}</blockquote>
            <figcaption className="mt-6 text-cream/70">
              <span className="font-bold text-cream">{name}</span> · <a href={`/${slug}`} className="underline-offset-4 hover:underline">{studio}</a>
            </figcaption>
          </figure>
        </li>
      ))}
    </ul>
  );
}
