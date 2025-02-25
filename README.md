# 小红书博主吐槽助手

这是一个基于Next.js开发的网站，可以对小红书博主进行幽默吐槽。用户只需输入小红书博主的链接，系统会自动爬取博主信息，并通过DeepSeek-R1人工智能生成幽默的吐槽内容。

## 功能特点

- 输入小红书博主链接，获取博主信息
- 使用r.jina.ai爬取小红书内容
- 通过DeepSeek-R1模型生成幽默吐槽
- 响应式设计，支持各种设备

## 技术栈

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- r.jina.ai 爬虫服务
- DeepSeek-R1 AI模型

## 安装与使用

1. 克隆仓库
```bash
git clone <repository-url>
cd xiaohongshu
```

2. 安装依赖
```bash
npm install
```

3. 设置环境变量
复制`.env.local.example`为`.env.local`，并填入你的DeepSeek API密钥：
```
DEEPSEEK_API_KEY=your_api_key_here
```

4. 运行开发服务器
```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## 部署

该项目可以轻松部署到Vercel等平台：

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyour-username%2Fxiaohongshu)

## 使用说明

1. 访问网站首页
2. 在输入框中粘贴小红书博主的主页链接（例如：https://www.xiaohongshu.com/user/profile/...）
3. 点击"生成吐槽"按钮
4. 等待AI分析完成，查看幽默吐槽结果

## 注意事项

- 本工具仅供娱乐，请文明使用
- 需要DeepSeek API密钥才能使用AI吐槽功能
- 爬虫功能依赖r.jina.ai服务

## 许可证

MIT
