"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { postJson } from "@/lib/http";
import type { Dealbreaker, Fit } from "@/lib/types";

const SUGGESTIONS = ["A gift for my elderly parent", "I'll use it every day for years", "I'm on a tight budget"];

export function FitPanel({
  dealbreakers,
  onFits,
  hasFits,
}: {
  dealbreakers: Dealbreaker[];
  onFits: (f: Record<string, Fit>) => void;
  hasFits: boolean;
}) {
  const [profile, setProfile] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const data = await postJson<{ fits: Fit[] }>("/api/fit", {
        profile,
        themes: dealbreakers.slice(0, 8).map((d) => ({
          id: d.id,
          name: d.name,
          description: d.description,
          examples: d.evidence
            .map((e) => e.quote)
            .filter((q): q is string => !!q)
            .slice(0, 3)
            .map((q) => q.slice(0, 300)),
        })),
      }, { timeoutMs: 30_000 });
      onFits(Object.fromEntries((data.fits as Fit[]).map((f) => [f.id, f])));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gold/30 bg-linear-to-br from-surface to-surface-2/60 p-5 md:p-6">
      <label htmlFor="profile" className="t-h3">
        How will you use it?
      </label>
      <p className="mt-1 text-sm text-subtle">We will sort the problems by how much they matter to you.</p>
      <Textarea
        id="profile"
        value={profile}
        onChange={(e) => setProfile(e.target.value)}
        maxLength={500}
        rows={2}
        placeholder="I travel every week and it has to survive a backpack"
        className="mt-4 resize-none border-line bg-canvas/70 text-base"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setProfile(s)}
            className="rounded-full border border-line px-3 py-1 text-xs text-subtle transition-colors hover:border-gold/60 hover:text-ink"
          >
            {s}
          </button>
        ))}
      </div>
      <Button
        onClick={run}
        disabled={busy || profile.trim().length < 3}
        className="mt-5 h-11 rounded-full px-5 text-sm font-semibold"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        {busy ? "Sorting" : hasFits ? "Sort again" : "Sort by what matters to me"}
      </Button>
      {error && <p className="mt-3 text-sm text-coral-ink" role="alert">{error}</p>}
    </div>
  );
}
