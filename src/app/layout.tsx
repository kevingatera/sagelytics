import { type Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { Providers } from "./providers";
import { auth } from "~/server/auth";

import "~/styles/globals.css";

export const metadata: Metadata = {
  title: {
    template: "%s | Sagelytics",
    default: "Sagelytics - AI-Powered Price Intelligence",
  },
  description:
    "Monitor your competitors, optimize your pricing, and grow your business with AI-powered insights.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

// const inter = Inter({ subsets: ["latin"] })

// RootLayout: wraps the app with global providers

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await auth();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const storageKey = "pricewhisperer-theme";
                  const theme = localStorage.getItem(storageKey);
                  const root = document.documentElement;
                  
                  if (theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
                    root.classList.add("dark");
                  } else {
                    root.classList.add("light");
                  }
                } catch (e) {
                  console.error("Error setting initial theme:", e);
                }
              })();
            `,
          }}
        />
      </head>
      <body className={GeistSans.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
