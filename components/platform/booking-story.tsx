"use client";

import { useRef, useState, type ComponentType } from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { ConfirmedScreen, PhoneFrame, ServicesScreen, TimeScreen, WhatsAppScreen } from "./demo-screens";

const STEPS: { title: string; text: string; Screen: ComponentType }[] = [
  {
    title: "A cliente abre o seu site",
    text: "Pelo link no Instagram, vê os serviços, os preços e o seu portfólio, e escolhe o que quer fazer.",
    Screen: ServicesScreen,
  },
  {
    title: "Escolhe uma hora livre",
    text: "O site conhece a sua agenda. As horas ocupadas ficam de fora, tendo em conta a duração dos serviços.",
    Screen: TimeScreen,
  },
  {
    title: "O pedido chega ao seu WhatsApp",
    text: "A mensagem já vem escrita, com nome, serviço, data e hora. Nada de perguntas e respostas para marcar.",
    Screen: WhatsAppScreen,
  },
  {
    title: "Confirma com um toque",
    text: "No painel, confirma ou recusa. Ao confirmar, a hora fica bloqueada no site e não há marcações sobrepostas.",
    Screen: ConfirmedScreen,
  },
];

/**
 * The phone stays put (CSS sticky) while the steps scroll past and swap its screen.
 * On small screens each step simply carries its own phone. Without JS or with
 * reduced motion the content is the same; only the transitions go.
 */
export function BookingStory() {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useGSAP(
    () => {
      gsap.utils.toArray<HTMLElement>("[data-step]").forEach((step, index) => {
        ScrollTrigger.create({
          trigger: step,
          start: "top 60%",
          end: "bottom 60%",
          onToggle: ({ isActive }) => isActive && setActive(index),
        });
      });
      gsap.from("[data-story-progress]", {
        scaleY: 0,
        ease: "none",
        scrollTrigger: { trigger: root.current, start: "top 60%", end: "bottom 60%", scrub: true },
      });
    },
    { scope: root },
  );

  return (
    <div ref={root} className="relative grid gap-10 lg:grid-cols-[1fr_auto] lg:gap-24">
      <ol className="relative flex flex-col lg:pl-10">
        <span className="absolute top-0 bottom-0 left-3 hidden w-px bg-line lg:block" />
        <span data-story-progress className="absolute top-0 bottom-0 left-3 hidden w-px origin-top bg-accent lg:block" />
        {STEPS.map(({ title, text, Screen }, index) => (
          <li
            key={title}
            data-step
            className={`relative flex flex-col gap-6 py-8 transition-opacity duration-300 lg:min-h-[70vh] lg:justify-center lg:py-0 ${
              active === index ? "lg:opacity-100" : "lg:opacity-35"
            }`}
          >
            <span
              className={`absolute top-1/2 -left-10 hidden size-6 -translate-y-1/2 place-items-center rounded-full text-xs font-bold transition-colors duration-300 lg:grid ${
                active >= index ? "bg-accent text-on-accent" : "bg-peach-100 text-ink-muted"
              }`}
            >
              {index + 1}
            </span>
            <div className="max-w-md">
              <p className="text-sm font-bold text-accent lg:hidden">Passo {index + 1}</p>
              <h3 className="font-display text-3xl leading-tight font-semibold sm:text-4xl">{title}</h3>
              <p className="mt-3 text-ink-muted sm:text-lg">{text}</p>
            </div>
            <PhoneFrame label={title} className="mx-auto lg:hidden">
              <Screen />
            </PhoneFrame>
          </li>
        ))}
      </ol>

      <div className="sticky top-[calc(50vh-16.5rem)] hidden h-fit self-start lg:block">
        <PhoneFrame label={`Ecrã do passo ${active + 1}: ${STEPS[active].title}`}>
          {STEPS.map(({ title, Screen }, index) => (
            <div
              key={title}
              className={`absolute inset-0 transition-[opacity,translate] duration-500 ease-(--ease-out-soft) motion-reduce:transition-none ${
                index === active ? "translate-y-0 opacity-100" : index < active ? "-translate-y-3 opacity-0" : "translate-y-3 opacity-0"
              }`}
            >
              <Screen />
            </div>
          ))}
        </PhoneFrame>
      </div>
    </div>
  );
}
