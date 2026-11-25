import type { Evidence } from "@/lib/types";
import { Stars } from "@/components/Stars";

export function snippet(text: string, quote: string | null, radius = 170) {
  if (quote) {
    const idx = text.toLowerCase().indexOf(quote.toLowerCase());
    if (idx >= 0) {
      const start = Math.max(0, idx - radius);
      const end = Math.min(text.length, idx + quote.length + radius);
      return {
        before: (start > 0 ? "…" : "") + text.slice(start, idx),
        match: text.slice(idx, idx + quote.length),
        after: text.slice(idx + quote.length, end) + (end < text.length ? "…" : ""),
      };
    }
  }
  const cut = text.length > radius * 2 ? text.slice(0, radius * 2) + "…" : text;
  return { before: cut, match: "", after: "" };
}

export function formatMonth(date?: string) {
  if (!date) return null;
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

export function EvidenceItem({ e }: { e: Evidence }) {
  const s = snippet(e.text, e.quote);
  const when = formatMonth(e.date);
  return (
    <li className="rounded-xl border border-line bg-surface p-4 text-[0.95rem]">
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-subtle">
        <Stars value={e.rating} size={12} />
        {when && <span>{when}</span>}
        {e.timeframe && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-ink">{e.timeframe}</span>}
      </div>
      {e.title && <p className="mb-1 font-semibold">{e.title}</p>}
      <p className="leading-relaxed whitespace-pre-line text-ink/90">
        {s.before}
        {s.match && <mark>{s.match}</mark>}
        {s.after}
      </p>
      {e.quote && !s.match && <p className="mt-2 border-l-2 border-gold pl-3 italic">“{e.quote}”</p>}
    </li>
  );
}
