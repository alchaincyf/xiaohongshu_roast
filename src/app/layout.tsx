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
  title: "小红书博主吐槽助手",
  description: "用 AI 智能生成对小红书博主的幽默吐槽",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <script dangerouslySetInnerHTML={{
          __html: `
            // 移除浏览器扩展可能添加的属性
            document.documentElement.removeAttribute('data-atm-ext-installed');
            document.documentElement.removeAttribute('youmind-sidebar-open');
            document.documentElement.removeAttribute('youmind-extension-version');
          `
        }} />
      </body>
    </html>
  );
}
