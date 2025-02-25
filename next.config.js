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
  // 移除不兼容的配置
  reactStrictMode: false,
  // 删除 swcMinify
  
  compiler: {
    // 移除 console.* 调用
    removeConsole: process.env.NODE_ENV === "production",
  },
  
  experimental: {},
  
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