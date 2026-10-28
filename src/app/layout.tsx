import type { Metadata, Viewport } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Navbar } from "@/components/layout/navbar";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body
        className={`${notoSansThai.className} min-h-dvh flex flex-col selection:bg-primary/20 selection:text-primary`}
      >
        <ThemeProvider>
          <Navbar />
          <main className="flex-1 mx-auto w-full max-w-7xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8 pb-24 md:pb-8">
            {children}
          </main>
          <footer className="hidden md:block border-t border-border/60 bg-card/50 py-4 text-center text-xs text-muted-foreground">
            LineCheck+ • ระบบเช็คชื่อหน้าเสาธงและบริหารจัดการกิจกรรมแก้แถว (รองรับทุกแพลตฟอร์ม: Mobile • Tablet • Desktop)
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
