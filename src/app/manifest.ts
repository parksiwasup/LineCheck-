import type { MetadataRoute } from "next";

const ICON_DATA_URI =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='512' height='512' viewBox='0 0 128 128' fill='none'%3E%3Crect width='128' height='128' rx='28' fill='%232563EB'/%3E%3Cpath d='M64 28L20 48L64 68L100 51.6V76H108V48L64 28Z' fill='white'/%3E%3Cpath d='M36 62.8V83.6C36 92.8 48.5 100 64 100C79.5 100 92 92.8 92 83.6V62.8L64 75.6L36 62.8Z' fill='white' fill-opacity='0.9'/%3E%3Ccircle cx='96' cy='94' r='20' fill='%2310B981' stroke='%230F172A' stroke-width='4'/%3E%3Cpath d='M88 94L93.5 99.5L105 88' stroke='white' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LineCheck+ | ระบบเช็คชื่อเข้าแถวและจัดการแก้กิจกรรมเข้าแถว",
    short_name: "LineCheck+",
    description:
      "Student Attendance & Remedial Activity Management System รองรับทุกแพลตฟอร์ม (Mobile, Tablet, Desktop)",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#2563eb",
    orientation: "any",
    icons: [
      {
        src: ICON_DATA_URI,
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: ICON_DATA_URI,
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
