import { BadgeCheck, CircleAlert } from "lucide-react";
import { RatingBar } from "@/components/RatingBar";
import { Stars } from "@/components/Stars";
import preview from "@/data/preview.json";

const SEV: Record<string, { dot: string; bar: string; label: string }> = {
  critical: { dot: "bg-coral", bar: "var(--coral)", label: "Critical" },
  major: { dot: "bg-ember", bar: "var(--ember)", label: "Major" },
  minor: { dot: "bg-subtle", bar: "var(--subtle)", label: "Minor" },
};

const pct = (v: number) => (v > 0 && v < 0.01 ? "<1%" : `${Math.round(v * 100)}%`);

export function ReportPreview() {
  const max = Math.max(...preview.dealbreakers.map((d) => d.share)) || 1;
  const grounded = preview.quality.proposed ? Math.round((preview.quality.grounded / preview.quality.proposed) * 100) : 0;
  return (
    <div className="flex h-full flex-col text-left">
      <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3 md:px-7">
        <div className="flex items-center gap-3">
          <span className="size-2.5 rounded-full bg-coral/80" />
          <span className="size-2.5 rounded-full bg-gold/80" />
          <span className="size-2.5 rounded-full bg-green/80" />
        </div>
        <span className="t-caption">{preview.total.toLocaleString()} reviews</span>
      </div>

      <div className="grid flex-1 gap-6 overflow-hidden p-5 md:grid-cols-[1.35fr_1fr] md:gap-8 md:p-7">
        <div className="min-w-0">
          <p className="t-caption">{preview.title}</p>
          <p className="mt-2 text-[clamp(1.25rem,2.2vw,1.9rem)] leading-[1.1] font-semibold tracking-[-0.02em]">
            {preview.headline.text}
          </p>
          <div className="mt-5 flex items-center gap-3">
            <span className="t-num text-4xl">{preview.avg?.toFixed(1)}</span>
            <Stars value={preview.avg} size={14} />
          </div>
          <RatingBar hist={preview.hist} className="mt-3 h-1.5" />

          <ul className="mt-6 divide-y divide-line border-y border-line">
            {preview.dealbreakers.map((d) => {
              const sev = SEV[d.severity] ?? SEV.minor;
              return (
                <li key={d.name} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 py-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={`size-2 shrink-0 rounded-full ${sev.dot}`} />
                    <span className="truncate text-[0.95rem] font-medium">{d.name}</span>
                  </div>
                  <span className="t-num text-xl">{pct(d.share)}</span>
                  <div className="col-span-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full" style={{ width: `${(d.share / max) * 100}%`, background: sev.bar }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="hidden min-w-0 flex-col gap-4 md:flex">
          <div className="rounded-xl border border-line bg-surface p-4">
            <p className="text-sm font-semibold">Before your return window closes</p>
            <ul className="mt-3 space-y-2.5">
              {preview.checklist.map((c) => (
                <li key={c.action} className="flex gap-2.5 text-sm leading-snug">
                  <span className="mt-0.5 size-4 shrink-0 rounded border border-line-strong" />
                  <span>
                    <span className="font-medium text-gold-ink">{c.when}. </span>
                    {c.action}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          {preview.dealbreakers[0]?.quote && (
            <figure className="rounded-xl border border-line p-4">
              <blockquote className="text-sm leading-relaxed">
                <mark>{preview.dealbreakers[0].quote}</mark>
              </blockquote>
              <figcaption className="t-caption mt-2">One of {preview.dealbreakers[0].count} reviews behind the top problem</figcaption>
            </figure>
          )}
          <div className="space-y-2 rounded-xl border border-line p-4 text-sm">
            <p className="flex items-center gap-2 text-green-ink">
              <BadgeCheck className="size-4" /> {grounded}% of AI quotes matched word for word
            </p>
            {preview.patterns.slice(0, 1).map((p) => (
              <p key={p.title} className="flex items-center gap-2 text-subtle">
                <CircleAlert className="size-4 shrink-0" /> {p.title}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
