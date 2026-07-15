import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-CL">
      <body>{children}</body>
    </html>
  );
}
