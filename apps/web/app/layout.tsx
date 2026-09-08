import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: "SkillBridge | AI Skill Intelligence for iGOT Karmayogi",
  description:
    "AI-powered competency assessment and personalized learning for India's Official Statistical System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${montserrat.className} bg-white text-ink antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
