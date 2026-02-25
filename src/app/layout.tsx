import type { Metadata, Viewport } from "next";
import { Inter, DM_Sans } from "next/font/google";
import "./globals.css";
import CookieConsentBar from '@/components/CookieConsentBar';
import GoogleAnalytics from '@/components/GoogleAnalytics';

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

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
const defaultTitle = 'FIBI – Organise Your Travel Inspiration'
const defaultDescription = 'Save places from Instagram and TikTok. Organise travel ideas beautifully on a map. Lightweight, calm, structured.'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: defaultTitle,
    template: '%s | FIBI',
  },
  description: defaultDescription,
  openGraph: {
    title: defaultTitle,
    description: defaultDescription,
    type: 'website',
    url: '/',
    images: [
      {
        url: '/hero-image.png',
        width: 1200,
        height: 630,
        alt: defaultTitle,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: defaultTitle,
    description: defaultDescription,
    images: ['/hero-image.png'],
  },
  icons: {
    icon: '/FIBI Logo.png',
    apple: '/FIBI Logo.png',
  },
  alternates: {
    canonical: '/',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'FIBI',
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#171717",
};

const structuredData = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'FIBI',
    url: 'https://fibi.world',
    logo: 'https://fibi.world/logo.png',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'FIBI',
    applicationCategory: 'https://schema.org/TravelApplication',
    operatingSystem: 'Web',
    description: defaultDescription,
  },
]

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-GB">
      <head>
        <link rel="manifest" href="/api/manifest" />
        <link rel="icon" href="/FIBI Logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/FIBI Logo.png" />
        <meta name="theme-color" content="#171717" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="FIBI" />
      </head>
      <body className={`${inter.variable} ${dmSans.variable} ${inter.className}`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {children}
        <CookieConsentBar />
        <GoogleAnalytics />
      </body>
    </html>
  );
}

