import type { Metadata, Viewport } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AppShell } from "@/components/layout/app-shell";
import { auth } from "@/lib/auth";

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export const metadata: Metadata = {
  title: "LineCheck+ | ระบบเช็คชื่อเข้าแถวและจัดการแก้กิจกรรมเข้าแถว",
  description:
    "Student Attendance & Remedial Activity Management System รองรับทุกแพลตฟอร์ม (iOS, Android, iPad, Tablet, Windows, macOS)",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "LineCheck+",
  },
  formatDetection: {
    telephone: false,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="th" suppressHydrationWarning>
      <body
        className={`${notoSansThai.className} min-h-dvh flex flex-col selection:bg-primary/20 selection:text-primary`}
      >
        <ThemeProvider>
          <AppShell session={session}>
            {children}
          </AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
