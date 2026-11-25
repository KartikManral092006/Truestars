"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Logo } from "./Logo";

const LINKS = [
  { href: "/#how", label: "How it works", hide: true },
  { href: "/analyze?mode=paste", label: "Paste reviews", hide: false },
  { href: "/accuracy", label: "Accuracy", hide: true },
];

export function SiteHeader({ fixed = false }: { fixed?: boolean }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!fixed) return;
    const el = ref.current;
    if (!el) return;
    let last = window.scrollY;
    let ticking = false;
    const update = () => {
      const y = window.scrollY;
      if (y > last + 4 && y > 120) el.dataset.hidden = "true";
      if (y < last - 4 || y < 120) el.dataset.hidden = "false";
      el.dataset.solid = y > window.innerHeight * 0.5 ? "true" : "false";
      last = y;
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => window.removeEventListener("scroll", onScroll);
  }, [fixed]);

  return (
    <header
      ref={ref}
      data-hidden="false"
      data-solid="false"
      className={`${fixed ? "fixed border-b border-transparent data-[solid=true]:border-line data-[solid=true]:bg-canvas/75 data-[solid=true]:backdrop-blur-xl" : "relative"} inset-x-0 top-0 z-40 transition-[translate,background-color,border-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] data-[hidden=true]:-translate-y-full`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Logo />
        <nav className="flex items-center gap-1 text-[0.9375rem] text-subtle sm:gap-2" aria-label="Main">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`${l.hide ? "hidden md:inline-flex" : "inline-flex"} rounded-full px-3 py-1.5 transition-colors hover:bg-surface-2/70 hover:text-ink`}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/extension"
            className="ml-1 inline-flex rounded-full border border-line px-3.5 py-1.5 text-ink transition-colors hover:border-gold/60"
          >
            <span className="hidden sm:inline">Get the extension</span>
            <span className="sm:hidden">Extension</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
