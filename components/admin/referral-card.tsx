"use client";

import { useState, useSyncExternalStore } from "react";
import { CheckIcon, CopyIcon, ExportIcon, GiftIcon, ShareNetworkIcon, WhatsappLogoIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import type { ReferredStudio } from "@/lib/billing/referral";

const joined = new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "short", year: "numeric" });

/** How the reward works, as lib/billing/referral.ts and the terms (app/termos) say. */
function referralRules(billedDirectly: boolean): string[] {
  const forYou = billedDirectly
    ? ["A sua conta não é paga pela Stripe, por isso não há cobrança para adiar: só o studio indicado ganha o mês."]
    : [
        "Você ganha um mês no fim do período que já pagou: a sua próxima cobrança passa um mês para a frente.",
        "Os meses somam: cada studio indicado que ativar a subscrição vale mais um mês.",
        "Só ganha se a sua subscrição estiver ativa quando o studio indicado pagar. Um mês que não ganhou nessa altura não é dado mais tarde.",
      ];
  return [
    "O studio indicado paga o primeiro mês normalmente e o mês seguinte é grátis.",
    ...forYou,
    "No plano anual, o mês grátis entra depois do ano já pago.",
    "Cada studio indicado conta uma vez. O mês grátis não é convertível em dinheiro e nada é devolvido.",
  ];
}

type ShareKind = "apple" | "other" | null;

/** Which share sheet the browser has, if any. Null on the server and where there's none. */
function shareKind(): ShareKind {
  if (typeof navigator.share !== "function") return null;
  // iPhone, iPad and Mac show the box with an arrow; Android and Windows the three dots.
  const apple = /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);
  return apple ? "apple" : "other";
}
const noSubscribe = () => () => {};

/** The system's share sheet, with its own icon; a WhatsApp link where there's no sheet. */
function ShareButton({ url, text }: { url: string; text: string }) {
  const kind = useSyncExternalStore(noSubscribe, shareKind, () => null);
  const className =
    "inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full bg-accent px-6 font-semibold text-on-accent hover:bg-accent-hover";

  if (!kind) {
    return (
      <a href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`} target="_blank" rel="noopener noreferrer" className={className}>
        <WhatsappLogoIcon size={18} weight="fill" aria-hidden="true" />
        Partilhar
      </a>
    );
  }

  const Icon = kind === "apple" ? ExportIcon : ShareNetworkIcon;
  async function share() {
    try {
      await navigator.share({ title: "Nailo App", text, url });
    } catch {
      // Closing the sheet without picking an app rejects; there's nothing to do.
    }
  }
  return (
    <button type="button" onClick={share} className={className}>
      <Icon size={18} weight="bold" aria-hidden="true" />
      Partilhar
    </button>
  );
}

/** The studio's referral link, and the studios that signed up through it. */
export function ReferralCard({
  url,
  referred,
  active,
  billedDirectly,
}: {
  url: string;
  referred: ReferredStudio[];
  /** Links only work once the studio's own site is published. */
  active: boolean;
  /** Without a Stripe subscription there's nothing to extend, so only the new studio gains. */
  billedDirectly: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const freeMonths = referred.filter((studio) => studio.rewarded).length;
  const share = "Uso o Nailo App para as marcações do meu studio. Cria o teu site por aqui e ganhas um mês grátis:";

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section aria-labelledby="referral-title" className="mt-6 flex flex-col gap-4 rounded-3xl bg-surface p-5 shadow-soft sm:p-8">
      <h2 id="referral-title" className="flex items-center gap-2 font-display text-2xl font-semibold">
        <GiftIcon size={24} aria-hidden="true" />
        Indique um studio
      </h2>
      <p>
        Quando um studio cria conta pelo seu link e a subscrição fica ativa,{" "}
        <strong>{billedDirectly ? "esse studio ganha um mês grátis" : "os dois ganham um mês grátis"}</strong>: a próxima
        cobrança passa um mês para a frente.
      </p>
      <div className="rounded-2xl bg-peach-50 p-4">
        <h3 className="text-sm font-bold">Como funciona</h3>
        <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-sm text-ink-muted marker:text-accent">
          {referralRules(billedDirectly).map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </div>
      {active ? (
        <>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              readOnly
              value={url}
              aria-label="O seu link de indicação"
              onFocus={(event) => event.currentTarget.select()}
              className="min-h-12 min-w-0 flex-1 rounded-2xl border border-line bg-peach-50 px-4 text-sm"
            />
            <Button variant="secondary" onClick={copy}>
              {copied ? <CheckIcon size={18} aria-hidden="true" /> : <CopyIcon size={18} aria-hidden="true" />}
              {copied ? "Copiado" : "Copiar link"}
            </Button>
            <ShareButton url={url} text={share} />
          </div>
          {referred.length === 0 ? (
            <p className="text-sm text-ink-muted">Ainda nenhum studio se registou pelo seu link.</p>
          ) : (
            <div>
              <h3 className="text-sm font-bold">
                Studios que indicou ({referred.length}) ·{" "}
                {freeMonths === 1 ? "1 mês grátis ganho" : `${freeMonths} meses grátis ganhos`}
              </h3>
              <ul className="mt-2 flex flex-col gap-2">
                {referred.map((studio) => (
                  <li key={`${studio.name}-${studio.joinedAt}`} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-peach-50 px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-semibold wrap-anywhere">{studio.name}</p>
                      <p className="text-xs text-ink-muted">Registou-se a {joined.format(new Date(studio.joinedAt))}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                        studio.rewarded ? "bg-success-soft text-success" : "bg-surface text-ink-muted"
                      }`}
                    >
                      {studio.rewarded ? "Mês grátis ganho" : studio.paying ? "Ativo" : "Ainda não ativou"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <p className="rounded-2xl bg-peach-50 p-3 text-sm text-ink-muted">O seu link fica disponível quando o site estiver publicado.</p>
      )}
    </section>
  );
}
