import type { Metadata, Viewport } from "next";
import { Martian_Mono } from "next/font/google";
import "./globals.css";
import ButikProvider from "@/components/Butik";
import Offline from "@/components/Offline";

/* Georgia finns i systemet och används för all antikva. Pico-stilen
   bakas in som appens kompakta gränssnittstypografi så att den också
   fungerar utan nät. Inget separat skaltypsnitt laddas. */
const pico = Martian_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-pico",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Oscars databas",
  description:
    "Kalender med dags-, tredagars-, vecko-, månads- och årsvy. Dragbara händelser, fullständiga upprepningsregler, och den fungerar utan nät.",
  manifest: "/manifest.webmanifest",
  applicationName: "Oscars databas",
  appleWebApp: {
    capable: true,
    title: "Oscars databas",
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
  themeColor: "#F7F7F5",
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
    <html lang="sv" className={pico.variable}>
      <body>
        <ButikProvider>
          {children}
          <Offline />
        </ButikProvider>
      </body>
    </html>
  );
}
