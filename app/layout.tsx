import type { Metadata, Viewport } from "next";
import { Newsreader, Martian_Mono } from "next/font/google";
import "./globals.css";
import ButikProvider from "@/components/Butik";
import Offline from "@/components/Offline";

/* Endast två familjer: hög-kontrast antikva till rubriker och siffror,
   monospace till allt annat. Ingen grotesk. Samma val som på Fornsvenska.
   Typsnitten bakas in i bygget av next/font, vilket också är det som gör
   att de finns kvar när enheten är offline. */
const display = Newsreader({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal"],
  variable: "--font-display",
  display: "swap",
});

const mono = Martian_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kalendariet",
  description:
    "Kalender med dags-, tredagars-, vecko-, månads- och årsvy. Dragbara händelser, fullständiga upprepningsregler, och den fungerar utan nät.",
  manifest: "/manifest.webmanifest",
  applicationName: "Kalendariet",
  appleWebApp: {
    capable: true,
    title: "Kalendariet",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/ikon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/ikon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  formatDetection: {
    // iOS gör annars om varje klockslag i rutnätet till en telefonlänk.
    telephone: false,
    date: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#FDFBEF",
  width: "device-width",
  initialScale: 1,
  // Zoomen lämnas påslagen med flit. Frestelsen att stänga av den är stor
  // i en app med drag — en oavsiktlig dubbeltryckszoom mitt i en gest är
  // irriterande — men att låsa zoomen gör appen obrukbar för den som
  // behöver förstora. Gestkonflikterna löses i stället med touch-action
  // på rutnätet, vilket träffar problemet utan att ta bort zoomen.
  maximumScale: 5,
  userScalable: true,
  // Låter appen rita ända ut i hörnen på telefoner med urklipp; insteget
  // hanteras med env(safe-area-inset-*) i CSS:en.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sv" className={`${display.variable} ${mono.variable}`}>
      <body>
        <ButikProvider>
          {children}
          <Offline />
        </ButikProvider>
      </body>
    </html>
  );
}
