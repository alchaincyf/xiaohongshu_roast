import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="zh">
      <Head>
        {/* 禁用 iOS 格式检测，防止将普通文本转换为链接 */}
        <meta
          name="format-detection"
          content="telephone=no, date=no, email=no, address=no"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
        <script dangerouslySetInnerHTML={{
          __html: `
            // 在页面加载完成后清除所有可能导致水合错误的属性
            document.addEventListener('DOMContentLoaded', function() {
              document.documentElement.removeAttribute('data-atm-ext-installed');
              document.documentElement.removeAttribute('youmind-sidebar-open');
              document.documentElement.removeAttribute('youmind-extension-version');
            });
          `
        }} />
      </body>
    </Html>
  )
} 