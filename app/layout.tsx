import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Speacy Realtime Tutor",
  description: "Realtime voice tutor prototype",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
