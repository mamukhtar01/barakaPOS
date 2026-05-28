import type { Metadata } from "next";
import "./globals.css";
import { ClientProvider } from "@/components/ClientProvider";

export const metadata: Metadata = {
  title: "Baraka POS",
  description: "Point of Sale system for Baraka Café",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <ClientProvider>{children}</ClientProvider>
      </body>
    </html>
  );
}
