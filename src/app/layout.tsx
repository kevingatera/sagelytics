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
      <body className={GeistSans.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
