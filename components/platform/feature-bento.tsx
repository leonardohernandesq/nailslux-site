import Image from "next/image";
import type { ReactNode } from "react";
import {
  AddressBookIcon,
  CalendarCheckIcon,
  CalendarDotsIcon,
  EnvelopeSimpleIcon,
  ChartLineUpIcon,
  HandIcon,
  ImagesIcon,
  MoonStarsIcon,
  PaletteIcon,
  WhatsappLogoIcon,
} from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react";
import { PORTFOLIO_MAX_ITEMS } from "@/lib/constants";
import heroImage from "@/public/brand/hero-hands.webp";

// Each card carries a small illustration that comes alive on hover. The
// illustrations are decoration (aria-hidden); the title and text say it all.

function Card({
  icon: CardIcon,
  title,
  text,
  wide = false,
  wideLg = false,
  wideMd = false,
  children,
}: {
  icon: Icon;
  title: string;
  text: string;
  /** Spans two columns from tablets up; `wideLg` only on the three-column desktop grid. */
  wide?: boolean;
  wideLg?: boolean;
  /** Spans two columns on tablets only, to fill the two-column grid. */
  wideMd?: boolean;
  children: ReactNode;
}) {
  return (
    <li
      data-spotlight
      className={`spotlight group relative flex flex-col overflow-hidden rounded-[1.75rem] bg-surface p-6 shadow-soft ring-1 ring-line transition-[box-shadow,translate] duration-500 ease-(--ease-out-soft) hover:-translate-y-1 hover:shadow-lift sm:p-7 ${
        wide ? "md:col-span-2" : wideLg ? "lg:col-span-2" : wideMd ? "md:col-span-2 lg:col-span-1" : ""
      }`}
    >
      <div aria-hidden="true" className="relative mb-6 flex h-36 items-center justify-center overflow-hidden rounded-2xl bg-peach-50">
        {children}
      </div>
      <span className="grid size-11 place-items-center rounded-full bg-ink text-gold">
        <CardIcon size={22} weight="duotone" aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-xl font-bold">{title}</h3>
      <p className="mt-2 text-ink-muted">{text}</p>
    </li>
  );
}

const MOVE = "transition-[translate,rotate,scale,opacity] duration-500 ease-(--ease-out-soft)";

export function FeatureBento() {
  return (
    <ul data-reveal-group className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      <Card wide icon={PaletteIcon} title="Um site com a sua marca" text="O seu logo, as suas cores, as suas fotografias. As clientes reconhecem o seu studio à primeira.">
        <div className="flex items-center gap-3">
          {["bg-ink", "bg-brand-flame", "bg-gold", "bg-peach-200"].map((tone, index) => (
            <span
              key={tone}
              style={{ transitionDelay: `${index * 50}ms` }}
              className={`size-10 rounded-full sm:size-14 ring-4 ring-surface shadow-soft ${tone} ${MOVE} ${index % 2 ? "group-hover:-translate-y-3" : "group-hover:translate-y-3"}`}
            />
          ))}
          <span className={`ml-2 hidden rounded-full bg-surface sm:inline px-5 py-2.5 font-luxe text-2xl italic shadow-soft ${MOVE} group-hover:scale-110`}>
            O seu studio
          </span>
        </div>
      </Card>

      <Card icon={WhatsappLogoIcon} title="Pedidos no WhatsApp" text="A mensagem chega já escrita: nome, serviço, dia e hora.">
        <div className="flex w-56 flex-col gap-2">
          <span className={`self-end rounded-2xl rounded-br-sm bg-[#d9fdd3] px-3 py-2 text-xs font-semibold text-ink shadow-soft ${MOVE} group-hover:-translate-y-1`}>
            Olá! Queria marcar verniz gel, sábado às 10:30 🌸
          </span>
          <span className={`self-start rounded-2xl rounded-bl-sm bg-surface px-3 py-2 text-xs font-semibold shadow-soft ${MOVE} translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100`}>
            Combinado, está marcado ✨
          </span>
        </div>
      </Card>

      <Card icon={CalendarCheckIcon} title="Agenda sem sobreposições" text="As horas ocupadas saem do site, tendo em conta a duração de cada serviço.">
        <div className="grid grid-cols-3 gap-2">
          {["09:30", "10:00", "10:30", "11:00", "11:30", "12:00"].map((time, index) => (
            <span
              key={time}
              className={`rounded-full px-3 py-1.5 text-center text-xs font-bold tabular-nums ${MOVE} ${
                index === 1 || index === 4
                  ? "bg-peach-100 text-ink-muted line-through"
                  : index === 2
                    ? "bg-surface text-ink shadow-soft group-hover:scale-110 group-hover:bg-accent group-hover:text-on-accent"
                    : "bg-surface text-ink shadow-soft"
              }`}
            >
              {time}
            </span>
          ))}
        </div>
      </Card>

      <Card icon={ImagesIcon} title="Portfólio que vende" text={`Até ${PORTFOLIO_MAX_ITEMS} fotografias, otimizadas para abrir num instante.`}>
        <div className="relative h-28 w-24">
          {["-rotate-6 group-hover:-translate-x-12 group-hover:-rotate-12", "rotate-0 group-hover:-translate-y-2", "rotate-6 group-hover:translate-x-12 group-hover:rotate-12"].map(
            (pose, index) => (
              <span key={pose} className={`absolute inset-0 overflow-hidden rounded-xl ring-4 ring-surface shadow-soft ${MOVE} ${pose}`}>
                <Image src={heroImage} alt="" fill sizes="96px" className={`object-cover ${["object-[20%_40%]", "object-[50%_50%]", "object-[80%_60%]"][index]}`} />
              </span>
            ),
          )}
        </div>
      </Card>

      <Card icon={HandIcon} title="Moldes de cada cliente" text="Os tamanhos de cada uma ficam guardados. Na próxima visita, já sabe.">
        <div className="flex gap-1.5">
          {[3, 6, 5, 7, 9].map((size, index) => (
            <span
              key={index}
              style={{ transitionDelay: `${index * 40}ms` }}
              className={`grid size-10 place-items-center rounded-xl bg-surface text-sm font-bold shadow-soft ${MOVE} group-hover:-translate-y-2 group-hover:bg-ink group-hover:text-gold`}
            >
              {size}
            </span>
          ))}
        </div>
      </Card>

      <Card icon={MoonStarsIcon} title="Aberto dia e noite" text="O site recebe pedidos a qualquer hora, mesmo enquanto atende ou dorme.">
        <div className="relative flex items-center gap-3">
          <MoonStarsIcon size={48} weight="duotone" className={`text-gold-deep ${MOVE} group-hover:-rotate-12 group-hover:scale-110`} />
          <span className="font-luxe text-6xl text-ink">24h</span>
        </div>
      </Card>

      <Card wideLg icon={ChartLineUpIcon} title="Estatísticas que mostram o caminho" text="Visitas, pedidos e os dias e horas mais procurados, para saber quando abrir mais vagas.">
        <div className="flex h-24 w-full max-w-sm items-end gap-2 px-6">
          {[35, 50, 42, 68, 88, 100, 22].map((value, index) => (
            <span
              key={index}
              style={{ height: `${value}%`, transitionDelay: `${index * 40}ms` }}
              className={`flex-1 origin-bottom rounded-t-md bg-gradient-to-t from-brand-coral to-gold ${MOVE} scale-y-50 group-hover:scale-y-100`}
            />
          ))}
        </div>
      </Card>

      <Card wideMd icon={AddressBookIcon} title="Ficha e histórico de cada cliente" text="Visitas, total gasto, última e próxima marcação, moldes e as suas notas, numa só ficha.">
        <div className="flex w-60 flex-col gap-2">
          {[
            { name: "Maria", visits: "12 visitas", tone: "bg-brand-flame" },
            { name: "Joana", visits: "5 visitas", tone: "bg-gold" },
            { name: "Rita", visits: "2 visitas", tone: "bg-ink" },
          ].map((client, index) => (
            <span
              key={client.name}
              style={{ transitionDelay: `${index * 60}ms` }}
              className={`flex items-center gap-2.5 rounded-xl bg-surface px-3 py-2 text-xs shadow-soft ${MOVE} ${index === 0 ? "group-hover:scale-105" : "group-hover:translate-x-2"}`}
            >
              <span className={`grid size-6 place-items-center rounded-full text-[0.65rem] font-bold text-white ${client.tone}`}>{client.name[0]}</span>
              <span className="flex-1 font-bold">{client.name}</span>
              <span className="text-ink-muted">{client.visits}</span>
            </span>
          ))}
        </div>
      </Card>

      <Card icon={CalendarDotsIcon} title="Agenda no seu calendário" text="As marcações confirmadas aparecem sozinhas no Google Calendar, no iPhone ou no Outlook.">
        <div className="w-48 overflow-hidden rounded-2xl bg-surface shadow-soft">
          <p className="bg-ink px-3 py-1.5 text-xs font-bold text-gold">Sábado, 8</p>
          <div className="flex flex-col gap-1.5 p-2.5">
            {["10:30 · Maria · Verniz gel", "14:00 · Joana · Pedicure"].map((event, index) => (
              <span
                key={event}
                style={{ transitionDelay: `${index * 80}ms` }}
                className={`rounded-lg border-l-4 border-brand-flame bg-peach-50 px-2 py-1 text-[0.68rem] font-semibold ${MOVE} ${index === 1 ? "translate-x-3 opacity-0 group-hover:translate-x-0 group-hover:opacity-100" : ""}`}
              >
                {event}
              </span>
            ))}
          </div>
        </div>
      </Card>

      <Card icon={EnvelopeSimpleIcon} title="Aviso de cada pedido" text="Recebe um email sempre que chega uma marcação nova, com tudo o que precisa para confirmar.">
        <div className="relative">
          <EnvelopeSimpleIcon size={64} weight="duotone" className={`text-gold-deep ${MOVE} group-hover:-rotate-6 group-hover:scale-110`} />
          <span className={`absolute -top-1 -right-2 grid size-6 place-items-center rounded-full bg-brand-flame text-xs font-bold text-white ring-4 ring-peach-50 ${MOVE} scale-0 group-hover:scale-100`}>
            1
          </span>
        </div>
      </Card>
    </ul>
  );
}
