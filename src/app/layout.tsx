import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FiBi - Save Your Travel Places",
  description: "Save travel places from social media before you lose them",
  openGraph: {
    title: "FiBi - Save Your Travel Places",
    description: "Save travel places from social media before you lose them",
    type: "website",
    images: [
      {
        url: "/hero-image.png",
        width: 1200,
        height: 630,
        alt: "FiBi - Save Your Travel Places",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FiBi - Save Your Travel Places",
    description: "Save travel places from social media before you lose them",
    images: ["/hero-image.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FiBi",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#171717",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-GB">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <meta name="theme-color" content="#171717" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="FiBi" />
      </head>
      <body>{children}</body>
    </html>
  );
}

