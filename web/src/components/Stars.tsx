const STAR = "M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z";

export function Stars({ value, size = 14 }: { value: number | null; size?: number }) {
  if (value == null) return <span className="text-xs text-subtle">no rating</span>;
  const label = `${value.toFixed(1)} out of 5 stars`;
  return (
    <span className="inline-flex items-center gap-px" role="img" aria-label={label} title={label}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, value - i + 1));
        return (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
            <path d={STAR} fill="var(--surface-2)" />
            {fill > 0 && (
              <path d={STAR} fill="var(--gold)" style={{ clipPath: `inset(0 ${(1 - fill) * 100}% 0 0)` }} />
            )}
          </svg>
        );
      })}
    </span>
  );
}
