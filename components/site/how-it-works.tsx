import { CalendarBlankIcon, HandHeartIcon, WhatsappLogoIcon } from "@phosphor-icons/react/ssr";
import { SectionHeading } from "./section-heading";

const STEPS = [
  {
    icon: HandHeartIcon,
    title: "Escolha o serviço",
    text: "Veja os serviços e preços e escolha o que lhe apetece.",
  },
  {
    icon: CalendarBlankIcon,
    title: "Indique data e hora",
    text: "Escolha o dia e a hora que lhe dão mais jeito.",
  },
  {
    icon: WhatsappLogoIcon,
    title: "Confirme no WhatsApp",
    text: "A mensagem segue pronta. Respondemos para confirmar a marcação.",
  },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" aria-labelledby="como-funciona-title" className="bg-peach-50 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading id="como-funciona-title" eyebrow="Como funciona" title="Marcar é simples" />
        <ol data-reveal-group className="grid gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative rounded-3xl bg-surface p-6 shadow-soft sm:p-8">
              <span
                aria-hidden="true"
                className="font-display absolute top-4 right-6 text-6xl font-bold text-peach-200"
              >
                {i + 1}
              </span>
              <span className="flex size-12 items-center justify-center rounded-2xl bg-peach-100 text-accent">
                <step.icon size={26} weight="duotone" aria-hidden="true" />
              </span>
              <h3 className="font-display mt-5 text-2xl font-semibold">{step.title}</h3>
              <p className="mt-2 text-ink-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
