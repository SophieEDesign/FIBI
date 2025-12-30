import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fibi - Save Your Travel Places",
  description: "Save travel places from social media before you lose them",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  );
}

