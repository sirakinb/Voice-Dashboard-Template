import type { Metadata } from "next";
import { Sora, Space_Mono } from "next/font/google";
import "./globals.css";
import { CanvasProvider } from "@/lib/canvas-context";
import { DemoProvider } from "@/lib/demo-context";
import { AuthProvider } from "@/lib/auth-context";
import { getCurrentUser } from "@/lib/insforge/server";
import { templateConfig } from "@/lib/template-config";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  weight: ["400", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: templateConfig.brand.dashboardTitle,
  description: templateConfig.brand.description,
  icons: {
    icon: [{ url: templateConfig.brand.iconSrc, type: "image/png" }],
    shortcut: templateConfig.brand.iconSrc,
    apple: templateConfig.brand.iconSrc,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <html lang="en">
      <body
        className={`${sora.variable} ${spaceMono.variable} antialiased`}
      >
        <AuthProvider initialUser={user}>
          <DemoProvider>
            <CanvasProvider>{children}</CanvasProvider>
          </DemoProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
