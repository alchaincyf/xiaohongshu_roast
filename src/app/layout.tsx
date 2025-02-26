import './globals.css'
import type { Metadata } from 'next'
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: '红薯吐槽机 - 小红书博主吐槽助手',
  description: 'AI驱动的小红书博主内容分析工具，让吐槽更有深度，更有趣',
  icons: [
    { rel: 'icon', url: '/favicon.ico' },
    { rel: 'icon', url: '/favicon.svg', type: 'image/svg+xml' }
  ]
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
  )
}
