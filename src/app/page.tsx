"use client";

import { useState, useRef } from "react";
import html2canvas from 'html2canvas';

interface BloggerInfo {
  nickname: string;
  avatar: string;
}

export default function Home() {
  const [url, setUrl] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [bloggerInfo, setBloggerInfo] = useState<BloggerInfo | null>(null);
  const resultCardRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult("");
    setBloggerInfo(null);

    try {
      if (!url.includes("xiaohongshu.com")) {
        throw new Error("请输入有效的小红书链接");
      }

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "分析失败，请稍后再试");
      }

      const data = await response.json();
      // Post-process the roast text to ensure proper formatting
      let processedRoast = data.roast || "";
      // Ensure double line breaks between paragraphs
      processedRoast = processedRoast.replace(/\n{3,}/g, '\n\n');
      setResult(processedRoast);
      if (data.blogger) {
        setBloggerInfo(data.blogger);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "发生未知错误");
      console.error("Error details:", err);
    } finally {
      setLoading(false);
    }
  };

  const saveAsImage = async () => {
    if (!resultCardRef.current) return;
    
    try {
      const canvas = await html2canvas(resultCardRef.current, {
        scale: 2, // 更高的分辨率
        backgroundColor: "#ffffff",
        logging: false,
      });
      
      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = `小红书吐槽-${bloggerInfo?.nickname || '未知博主'}-${new Date().getTime()}.png`;
      link.click();
    } catch (err) {
      console.error("保存图片时出错:", err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-xl font-bold text-red-600">小红书博主吐槽助手</h1>
          <a 
            href="https://github.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-gray-700"
          >
            GitHub
          </a>
        </div>
      </header>

      <main className="flex-grow container mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium mb-6">输入小红书博主链接，生成幽默吐槽</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
                小红书博主链接
              </label>
              <input
                type="text"
                id="url"
                placeholder="https://www.xiaohongshu.com/user/profile/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? '分析中...' : '生成吐槽'}
            </button>
          </form>

          {error && (
            <div className="mt-6 bg-red-50 border-l-4 border-red-500 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {result && (
            <div className="mt-8 mx-auto max-w-2xl overflow-hidden bg-white rounded-xl shadow-xl" ref={resultCardRef}>
              {/* 博主信息区域 - 改进版，增大头像和文字 */}
              <div className="bg-gradient-to-r from-red-50 to-pink-50 p-6 border-b border-gray-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    {bloggerInfo?.avatar ? (
                      <div className="h-20 w-20 rounded-full overflow-hidden relative border-2 border-white shadow-md">
                        <img 
                          src={bloggerInfo.avatar} 
                          alt={`${bloggerInfo.nickname}的头像`}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = "/default-avatar.svg";
                          }}
                        />
                      </div>
                    ) : (
                      <div className="h-20 w-20 rounded-full bg-gradient-to-br from-red-200 to-red-300 flex items-center justify-center shadow-md">
                        <span className="text-white text-2xl font-bold">
                          {bloggerInfo?.nickname ? bloggerInfo.nickname.charAt(0) : "?"}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="ml-6">
                    <h3 className="text-2xl font-bold text-gray-900">
                      {bloggerInfo?.nickname || "未知博主"}
                    </h3>
                  </div>
                </div>
              </div>
              
              {/* 吐槽内容区域 - 改进版，优化排版 */}
              <div className="p-8 bg-white">
                <h3 className="flex items-center text-xl font-bold mb-5 text-gray-900">
                  <span className="inline-block w-8 h-8 bg-rose-500 rounded-full mr-3 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                      <path fillRule="evenodd" d="M4.804 21.644A6.707 6.707 0 006 21.75a6.721 6.721 0 003.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.226.277.428.254.543a3.73 3.73 0 01-.814 1.686.75.75 0 00.44 1.223zM8.25 10.875a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25zM10.875 12a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0zm4.875-1.125a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25z" clipRule="evenodd" />
                    </svg>
                  </span>
                  AI吐槽
                </h3>

                <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed">
                  {result.split('\n').map((line, i) => {
                    // 处理标题
                    if (line.startsWith('【') && line.includes('】')) {
                      return <h4 key={i} className="text-xl font-bold mt-6 mb-4 text-rose-600">{line}</h4>;
                    }
                    // 处理加粗文本 - 修复bold标记解析
                    else if (line.includes('**') && line.split('**').length > 2) {
                      const parts = line.split('**');
                      return (
                        <p key={i} className="mb-4">
                          {parts.map((part, j) => j % 2 === 0 
                            ? part 
                            : <strong key={j} className="font-bold text-rose-700">{part}</strong>
                          )}
                        </p>
                      );
                    }
                    // 正常段落
                    else if (line.trim()) {
                      return <p key={i} className="mb-4">{line}</p>;
                    }
                    // 空行
                    return <div key={i} className="h-2" />;
                  })}
                </div>
              </div>
              
              {/* 底部分享区域 - 改进版 */}
              <div className="px-8 py-4 bg-gradient-to-r from-gray-50 to-rose-50 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-500 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 mr-1">
                      <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd" />
                    </svg>
                    生成于 {new Date().toLocaleString('zh-CN')}
                  </p>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(result);
                        // 使用更现代的提示方式，替代alert
                        const notification = document.createElement('div');
                        notification.className = 'fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg opacity-0 transition-opacity';
                        notification.textContent = '吐槽内容已复制到剪贴板';
                        document.body.appendChild(notification);
                        setTimeout(() => notification.classList.add('opacity-100'), 10);
                        setTimeout(() => {
                          notification.classList.remove('opacity-100');
                          setTimeout(() => document.body.removeChild(notification), 300);
                        }, 2000);
                      }}
                      className="flex items-center px-4 py-2 bg-white text-rose-600 rounded-full shadow hover:bg-rose-50 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm font-medium"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 mr-1">
                        <path fillRule="evenodd" d="M17.663 3.118c.225.015.45.032.673.05C19.876 3.298 21 4.604 21 6.109v9.642a3 3 0 01-3 3V16.5c0-5.922-4.576-10.775-10.384-11.217.324-1.132 1.3-2.01 2.548-2.114.224-.019.448-.036.673-.051A3 3 0 0113.5 1.5H15a3 3 0 012.663 1.618zM12 4.5A1.5 1.5 0 0113.5 3H15a1.5 1.5 0 011.5 1.5H12z" clipRule="evenodd" />
                        <path d="M3 8.625c0-1.036.84-1.875 1.875-1.875h.375A3.75 3.75 0 019 10.5v1.875c0 1.036.84 1.875 1.875 1.875h.375a3.75 3.75 0 013.75 3.75v1.875c0 1.036-.84 1.875-1.875 1.875H6A3 3 0 013 18V8.625z" />
                      </svg>
                      复制内容
                    </button>
                    <button 
                      onClick={saveAsImage}
                      className="flex items-center px-4 py-2 bg-white text-blue-600 rounded-full shadow hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 mr-1">
                        <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z" clipRule="evenodd" />
                      </svg>
                      保存为图片
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="max-w-3xl mx-auto mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium mb-4">使用说明</h2>
          <ol className="list-decimal pl-5 space-y-2">
            <li>复制小红书博主的主页链接（例如：https://www.xiaohongshu.com/user/profile/...）</li>
            <li>粘贴到上方输入框</li>
            <li>点击&quot;生成吐槽&quot;按钮</li>
            <li>等待AI分析完成，查看幽默吐槽结果</li>
          </ol>
          <p className="mt-4 text-sm text-gray-500">注意：本工具仅供娱乐，请文明使用，勿用于攻击他人。</p>
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            © {new Date().getFullYear()} 小红书博主吐槽助手 - 本网站仅供娱乐
          </p>
        </div>
      </footer>
    </div>
  );
} 