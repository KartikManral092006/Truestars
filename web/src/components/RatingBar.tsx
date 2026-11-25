const COLORS = ["var(--coral)", "var(--ember)", "var(--subtle)", "#ffe08f", "var(--gold)"];

export function RatingBar({ hist, className = "" }: { hist: number[]; className?: string }) {
  const total = hist.reduce((a, b) => a + b, 0) || 1;
  const label = [5, 4, 3, 2, 1].map((s) => `${Math.round((hist[s - 1] / total) * 100)}% ${s}-star`).join(", ");
  return (
    <div className={`flex h-2 overflow-hidden rounded-full bg-surface-2 ${className}`} role="img" aria-label={label}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} style={{ width: `${(hist[s - 1] / total) * 100}%`, background: COLORS[s - 1] }} />
      ))}
    </div>
  );
}
