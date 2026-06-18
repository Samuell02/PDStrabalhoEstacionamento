import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ParkSystem",
  description: "Sistema de estacionamento",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('nightMode');
                  var isDark = saved !== null ? JSON.parse(saved) : false;
                  var html = document.documentElement;
                  var bg = isDark ? '#1a1a1a' : '#FFF5F2';
                  var gradient = isDark
                    ? 'linear-gradient(160deg, #1a1a1a 0%, #161616 45%, #0f0f0f 100%)'
                    : 'linear-gradient(160deg, #FFF5F2 0%, #FFFAF7 45%, #FAF3EE 100%)';
                  html.classList.toggle('dark', isDark);
                  html.style.setProperty('--bg-color', bg);
                  html.style.setProperty('--bg-gradient', gradient);
                  html.style.backgroundColor = bg;
                  html.style.colorScheme = isDark ? 'dark' : 'light';
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}