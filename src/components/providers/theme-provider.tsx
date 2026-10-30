"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { Toaster } from "sonner";

// กรอง False-positive warning ของ React 19 กับ next-themes script tag ป้องกัน Next.js dev overlay เด้งเตือน
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const origError = console.error;
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("Encountered a script tag")
    ) {
      return;
    }
    origError.apply(console, args);
  };
}

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
      <Toaster richColors position="top-right" closeButton />
    </NextThemesProvider>
  );
}
