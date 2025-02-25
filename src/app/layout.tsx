import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-inter',
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
      <body className={inter.className}>
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
