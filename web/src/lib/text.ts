export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’‛′]/g, "'")
    .replace(/[“”‟″]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokens(s: string): string[] {
  return normalize(s)
    .replace(/[^\p{L}\p{N}\s']/gu, " ")
    .split(" ")
    .filter(Boolean);
}

export function quoteIsGrounded(quote: string, text: string): boolean {
  const q = normalize(quote).replace(/^["'.\s]+|["'.\s]+$/g, "");
  if (q.length < 3) return false;
  return normalize(text).includes(q);
}

export function cleanLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[.!?;:,]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.7 ? cut.slice(0, lastSpace) : cut) + "…";
}
