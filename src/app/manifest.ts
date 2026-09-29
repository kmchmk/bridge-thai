import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bridge Thai",
    short_name: "Bridge Thai",
    description: "Learn Thai by role-play: the words change with who you're talking to, and where.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0ea5d9",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
