"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "@phosphor-icons/react";

/** A link shown in full, with a button that copies it. */
export function CopyLink({ url, label }: { url: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <input
        readOnly
        value={url}
        aria-label={label}
        onFocus={(event) => event.currentTarget.select()}
        className="min-h-10 min-w-0 flex-1 rounded-xl border border-line bg-peach-50 px-3 text-sm"
      />
      <button
        type="button"
        onClick={copy}
        className="inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 text-sm font-semibold ring-1 ring-line-strong hover:bg-peach-50"
      >
        {copied ? <CheckIcon size={16} aria-hidden="true" /> : <CopyIcon size={16} aria-hidden="true" />}
        {copied ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}
