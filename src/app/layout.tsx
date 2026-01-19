import type { Metadata, Viewport } from "next";
import "./globals.css";

function getSiteUrl(): string {
  if (typeof process !== 'undefined') {
    if (process.env.NEXT_PUBLIC_SITE_URL) {
      return process.env.NEXT_PUBLIC_SITE_URL
    }
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`
    }
  }
  return 'https://fibi.world'
}

const siteUrl = getSiteUrl()

export const metadata: Metadata = {
  title: "FiBi - Save Your Travel Places",
  description: "Save travel places from social media before you lose them",
  openGraph: {
    title: "FiBi - Save Your Travel Places",
    description: "Save travel places from social media before you lose them",
    type: "website",
    url: siteUrl,
    images: [
      {
        url: `${siteUrl}/hero-image.png`,
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
    images: [`${siteUrl}/hero-image.png`],
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
        <link rel="icon" href="/FIBI Logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/FIBI Logo.png" />
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

