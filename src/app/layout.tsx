import { GeistSans } from "geist/font/sans"
// import { Inter } from "next/font/google"
import { ThemeProvider } from "~/components/theme-provider"
import "~/styles/globals.css"
import type React from "react"
import { type Metadata } from "next"
import { TRPCReactProvider } from "~/trpc/react"
import { SessionProvider } from "next-auth/react"

export const metadata: Metadata = {
  title: "Sagelytics - AI-Powered Pricing Strategy Platform",
  description: "Optimize your e-commerce pricing with AI-driven insights and automated strategies.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

// const inter = Inter({ subsets: ["latin"] })

console.log("Before RootLayout");

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={GeistSans.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <SessionProvider>
            <TRPCReactProvider>
              {children}
            </TRPCReactProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

