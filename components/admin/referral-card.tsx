"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon, GiftIcon, WhatsappLogoIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

/** The studio's referral link, with how many studios signed up through it. */
export function ReferralCard({
  url,
  creditLabel,
  signedUp,
  rewarded,
  active,
  billedDirectly,
}: {
  url: string;
  creditLabel: string;
  signedUp: number;
  rewarded: number;
  /** Links only work once the studio's own site is published. */
  active: boolean;
  /** Without a Stripe account there's no balance to credit, so only the new studio gains. */
  billedDirectly: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const share = `Uso o Nailo App para as marcações do meu studio. Cria o teu site por aqui e ganhas ${creditLabel} de crédito: ${url}`;

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
        <strong>{billedDirectly ? "esse studio ganha" : "os dois ganham"} {creditLabel}</strong> de crédito, o valor de um mês,
        descontado nas faturas seguintes.
      </p>
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
            <a
              href={`https://wa.me/?text=${encodeURIComponent(share)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-accent px-6 font-semibold text-on-accent hover:bg-accent-hover"
            >
              <WhatsappLogoIcon size={18} weight="fill" aria-hidden="true" />
              Partilhar
            </a>
          </div>
          <p className="text-sm text-ink-muted">
            {signedUp === 0
              ? "Ainda nenhum studio se registou pelo seu link."
              : `${signedUp === 1 ? "1 studio registou-se" : `${signedUp} studios registaram-se`} pelo seu link · ${rewarded} com crédito atribuído.`}
          </p>
        </>
      ) : (
        <p className="rounded-2xl bg-peach-50 p-3 text-sm text-ink-muted">O seu link fica disponível quando o site estiver publicado.</p>
      )}
    </section>
  );
}
