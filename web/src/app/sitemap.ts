import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    { path: "", priority: 1 },
    { path: "/analyze?sample=bathroom-scale", priority: 0.8 },
    { path: "/analyze?sample=white-noise-machine", priority: 0.7 },
    { path: "/analyze?sample=facial-massager", priority: 0.7 },
    { path: "/analyze?mode=paste", priority: 0.6 },
    { path: "/extension", priority: 0.5 },
  ];
  return pages.map((p) => ({ url: `${SITE_URL}${p.path}`, changeFrequency: "weekly", priority: p.priority }));
}
