import type { MetadataRoute } from "next";

/**
 * Makes the OS installable to a phone home screen. On iOS that is the only way
 * the Notification API becomes available at all.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sandeep OS",
    short_name: "Sandeep OS",
    description: "Sandeep Gowda's portfolio, as a desktop OS.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0f",
    theme_color: "#0a0a0f",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
