"use client";

import { useRef } from "react";
import { BellRingingIcon, CheckCircleIcon } from "@phosphor-icons/react/ssr";
import { gsap, MOTION_OK, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { PhoneFrame, SentScreen, ServicesScreen, TimeScreen } from "./demo-screens";

/**
 * A booking playing on a loop: a client picks a service and a time, the request
 * lands in the studio's panel and the studio confirms it. With reduced motion it
 * stays on its first frame. The loop pauses while off screen.
 */
export function HeroDemo() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(MOTION_OK, () => {
        const q = gsap.utils.selector(root);
        const [services, times, sent] = [q('[data-layer="services"]'), q('[data-layer="times"]'), q('[data-layer="sent"]')];
        const tap = q('[data-demo="tap"]');

        const card = q('[data-demo="card"]');
        gsap.set([times, sent], { autoAlpha: 0, x: 24 });
        gsap.set(card, { autoAlpha: 0, y: 18, scale: 0.96 });

        const press = (x: string, y: string) =>
          gsap
            .timeline()
            .set(tap, { left: x, top: y })
            .fromTo(tap, { autoAlpha: 0, scale: 1.8 }, { autoAlpha: 1, scale: 1, duration: 0.3, ease: "power2.out" })
            .to(tap, { scale: 0.75, duration: 0.12, ease: "power2.in" })
            .to(tap, { scale: 1, autoAlpha: 0, duration: 0.25 });

        const swap = (from: gsap.DOMTarget, to: gsap.DOMTarget) =>
          gsap
            .timeline()
            .to(from, { autoAlpha: 0, x: -24, duration: 0.35, ease: "power2.in" })
            .to(to, { autoAlpha: 1, x: 0, duration: 0.45, ease: "power3.out" }, "-=0.08");

        const loop = gsap
          .timeline({ repeat: -1, repeatDelay: 1.4, delay: 0.9, defaults: { ease: "power2.out" } })
          .add(press("28%", "27%"), "+=0.5")
          .to(q('[data-demo="service-picked"]'), { opacity: 1, duration: 0.2 }, "-=0.25")
          .add(swap(services, times), "+=0.35")
          .add(press("74%", "36%"), "+=0.45")
          .to(q('[data-demo="time-picked"]'), { opacity: 1, duration: 0.2 }, "-=0.25")
          .add(swap(times, sent), "+=0.35")
          .from(q('[data-demo="sent-check"]'), { scale: 0, duration: 0.5, ease: "back.out(2.2)" }, "-=0.15")
          .to(card, { autoAlpha: 1, y: 0, scale: 1, duration: 0.55, ease: "back.out(1.5)" }, "+=0.2")
          .to(q('[data-demo="confirm"]'), { scale: 0.93, duration: 0.12 }, "+=0.9")
          .to(q('[data-demo="confirm"]'), { scale: 1, duration: 0.15 })
          .to(q('[data-demo="confirmed"]'), { autoAlpha: 1, duration: 0.25 }, "-=0.08")
          .to({}, { duration: 1.8 })
          .to([sent, card], { autoAlpha: 0, duration: 0.4 })
          .set(sent, { x: 24 })
          .set(card, { y: 18, scale: 0.96 })
          .set(q('[data-demo="confirmed"]'), { autoAlpha: 0 })
          .set(q('[data-demo="service-picked"], [data-demo="time-picked"]'), { opacity: 0 })
          .set(times, { x: 24 })
          .to(services, { autoAlpha: 1, x: 0, duration: 0.4 });

        ScrollTrigger.create({
          trigger: root.current,
          start: "top bottom",
          end: "bottom top",
          onToggle: ({ isActive }) => (isActive ? loop.play() : loop.pause()),
        });
      });

      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <div ref={root} data-hero="image" className="relative mx-auto w-fit pb-10 md:pr-16">
      <span className="absolute inset-x-[-15%] top-[8%] bottom-[8%] -z-10 rounded-full bg-brand-flame/30 blur-3xl" />
      <PhoneFrame label="Demonstração: uma cliente marca um serviço no telemóvel e o pedido chega ao painel do studio.">
        <div data-layer="services" className="absolute inset-0">
          <ServicesScreen picked={false} />
        </div>
        <div data-layer="times" className="invisible absolute inset-0">
          <TimeScreen picked={false} />
        </div>
        <div data-layer="sent" className="invisible absolute inset-0">
          <SentScreen />
        </div>
        <span
          data-demo="tap"
          className="invisible absolute z-20 -mt-4 -ml-4 size-8 rounded-full bg-ink/25 ring-2 ring-white/80"
        />
      </PhoneFrame>

      <div
        data-demo="card"
        aria-hidden="true"
        className="absolute -right-4 bottom-0 w-60 rounded-2xl bg-surface p-3.5 text-ink shadow-lift sm:-right-10 md:right-0"
      >
        <p className="flex items-center gap-1.5 text-xs font-bold text-accent">
          <BellRingingIcon size={15} weight="fill" />
          Novo pedido no painel
        </p>
        <p className="mt-1.5 text-sm font-bold">Maria · Verniz gel</p>
        <p className="text-xs text-ink-muted">Sábado às 10:30</p>
        <div className="relative mt-2.5">
          <span data-demo="confirm" className="block rounded-full bg-accent py-1.5 text-center text-xs font-bold text-on-accent">
            Confirmar
          </span>
          <span
            data-demo="confirmed"
            className="invisible absolute inset-0 flex items-center justify-center gap-1 rounded-full bg-success-soft text-xs font-bold text-success"
          >
            <CheckCircleIcon size={14} weight="fill" />
            Confirmada
          </span>
        </div>
      </div>
    </div>
  );
}
