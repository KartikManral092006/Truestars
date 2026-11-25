import Link from "next/link";

export function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" fill="var(--gold)" />
      <path
        d="M8.2 12.2l2.6 2.5 5-5.2"
        fill="none"
        stroke="var(--canvas)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="font-display inline-flex items-center gap-2 text-lg font-bold tracking-tight text-ink"
      style={{ fontVariationSettings: "'wdth' 88" }}
    >
      <LogoMark />
      TrueStars
    </Link>
  );
}
