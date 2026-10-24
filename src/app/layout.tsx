import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MD2ABNT — Markdown para os padrões ABNT",
  description:
    "Conversor de anotações em Markdown para documentos formatados nos padrões ABNT (NBR 14724, 6022, 6024, 10520, 6023 e 6028), com geração de DOCX e PDF.",
  keywords: ["ABNT", "Markdown", "NBR 14724", "artigo científico", "conversor", "DOCX", "PDF"],
  authors: [{ name: "MD2ABNT" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
