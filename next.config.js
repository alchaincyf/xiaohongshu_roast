/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // 在生产构建时忽略 ESLint 错误
    ignoreDuringBuilds: true,
  },
  typescript: {
    // 在生产构建时忽略 TypeScript 错误
    ignoreBuildErrors: true,
  },
  // 采用最简单的配置，只留下必要项
  reactStrictMode: false,
  swcMinify: true,
  // 禁用 React 的开发模式提示
  compiler: {
    // 移除 console.* 调用
    removeConsole: process.env.NODE_ENV === "production",
  },
  // 禁用 "use client" 指令的自动处理
  experimental: {
    // 在生产中，移除所有控制台日志
    optimizeCss: true,
    // 忽略 ESLint 错误
    appDir: true,
  },
  // 添加图片域名配置
  images: {
    domains: [
      'sns-avatar-qc.xhscdn.com',    // 小红书头像域名
      'sns-img-qc.xhscdn.com',       // 小红书图片域名
      'ci.xiaohongshu.com',          // 小红书另一个图片域名
      'sns-img-bd.xhscdn.com',       // 可能的头像域名变体
      'sns-avatar-bd.xhscdn.com'     // 可能的头像域名变体
    ],
  },
};

module.exports = nextConfig; 