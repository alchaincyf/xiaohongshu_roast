"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import html2canvas from 'html2canvas';
import { useSearchParams, useRouter } from 'next/navigation';
import { saveRoast, getRecentRoasts, getRoastByShareId, RoastRecord } from '@/lib/firestore';
import { initAnalytics } from '@/lib/firebase';
import NextImage from 'next/image';

interface BloggerInfo {
  nickname: string;
  avatar: string;
}

// 创建一个包装组件，解决 hydration 问题
const ClientOnlyWrapper = ({ children }: { children: React.ReactNode }) => {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex flex-col">
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-10 border-b border-gray-100">
          <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-xl font-medium text-gray-900">
              <span className="text-red-500">小红书</span>博主吐槽助手
            </h1>
          </div>
        </header>
        <main className="flex-1 py-8">
          <div className="max-w-4xl mx-auto px-4">
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <p>加载中...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }
  
  return <>{children}</>;
};

// 创建一个使用 searchParams 的子组件
function SearchParamsComponent({ onParamsLoad }: { onParamsLoad: (share: string | null) => void }) {
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const share = searchParams.get('share');
    onParamsLoad(share);
  }, [searchParams, onParamsLoad]);
  
  return null; // 这个组件不渲染任何内容，只是处理 searchParams
}

// 创建一个带超时的 Promise
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`操作超时 (${timeoutMs}ms)`)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]);
}

function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-gradient-to-b from-gray-900 to-black text-white py-12 mt-16">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8">
          <div className="mb-6 md:mb-0">
            <h3 className="text-xl font-bold flex items-center">
              <span className="mr-2">👻</span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-rose-400 to-pink-300">
                红薯吐槽机
              </span>
            </h3>
            <p className="text-gray-400 mt-2 max-w-md">
              AI驱动的小红书博主内容分析工具，让吐槽更有深度，更有趣
            </p>
          </div>
          
          <div className="flex space-x-4">
            <a href="#" className="text-gray-400 hover:text-pink-400 transition-colors">
              <span className="sr-only">关于我们</span>
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" clipRule="evenodd"></path>
              </svg>
            </a>
            <a href="#" className="text-gray-400 hover:text-pink-400 transition-colors">
              <span className="sr-only">隐私政策</span>
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" clipRule="evenodd"></path>
              </svg>
            </a>
            <a href="https://github.com/yourusername/xiaohongshu-roast" className="text-gray-400 hover:text-pink-400 transition-colors">
              <span className="sr-only">GitHub</span>
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.032 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"></path>
              </svg>
            </a>
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-700 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-gray-500">&copy; {currentYear} 红薯吐槽机. 保留所有权利.</p>
          <p className="text-xs text-gray-500 mt-2 md:mt-0">本工具仅供娱乐使用，AI生成内容不代表开发者观点</p>
        </div>
      </div>
    </footer>
  );
}

// 将handleImageError提升到组件之外，使其成为全局函数
// 添加在Footer组件之后，所有卡片组件之前
function handleImageError(event: React.SyntheticEvent<HTMLImageElement, Event>) {
  const img = event.currentTarget;
  console.log(`图片加载失败: ${img.src}，使用默认头像`);
  img.src = '/default-avatar.svg';
  img.onerror = null; // 防止循环触发
}

// 更新 ResultCard 组件，优化间距和视觉设计
function ResultCard({ bloggerInfo, url, result, resultCardRef, saveAsImage, shareRoast, handleOpenHistoryModal, shareId }) {
  // 处理文本格式化，优化与标题的关联性
  const formatRoastContent = (content) => {
    // 替换【标题】为带样式的标题 - 增加上边距，减少下边距，符合格式塔原理
    const withFormattedHeadings = content.replace(/【(.*?)】/g, '<h3 class="text-lg font-bold text-pink-600 mt-5 mb-0.5 flex items-center"><span class="w-1 h-4 bg-pink-500 rounded mr-1.5"></span>$1</h3>');
    
    // 替换**文本**为加粗高亮文本
    const withBoldText = withFormattedHeadings.replace(/\*\*(.*?)\*\*/g, '<span class="font-bold bg-pink-50 text-pink-700 px-1 rounded">$1</span>');
    
    // 处理换行，减少垂直间距
    return withBoldText
      .split(/\n\n+/) // 分割双换行以上的为段落
      .map(para => para
        .replace(/\n/g, '<br class="mb-0.5" />') // 单换行替换为小间距换行
      )
      .join('<div class="mb-1.5"></div>'); // 段落间使用小型间隔
  };

  return (
    <div 
      ref={resultCardRef} 
      className="bg-white rounded-xl overflow-hidden shadow-lg border border-pink-100 transform transition-all duration-500 hover:shadow-xl"
    >
      {/* 博主信息区域 - 减小内边距 */}
      <div className="bg-gradient-to-r from-rose-400 to-pink-500 p-4 text-white">
        <div className="flex items-center">
          <img 
            src={bloggerInfo.avatar || '/default-avatar.svg'} 
            alt={bloggerInfo.nickname} 
            className="w-14 h-14 rounded-full border-2 border-white shadow-md object-cover"
            onError={handleImageError}
          />
          <div className="ml-3">
            <h3 className="text-lg font-bold">{bloggerInfo.nickname}</h3>
            <div className="flex items-center">
              <p className="text-rose-100 text-xs">小红书博主</p>
              <div className="ml-2 text-xs bg-white/20 px-1.5 py-0.5 rounded-full inline-block">
                被DeepSeek吐槽
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* 优化后的吐槽内容区域 - 通过自定义样式覆盖减小默认间距 */}
      <div className="px-4 py-3 bg-white">
        <div 
          className="prose prose-sm prose-pink max-w-none text-gray-700 leading-relaxed [&>p]:my-1 [&>p:first-child]:mt-0 [&>h3]:text-pink-600 [&>h3]:font-bold [&>h3+p]:mt-0.5 [&_br]:mb-0"
          dangerouslySetInnerHTML={{ __html: formatRoastContent(result) }}
        />
        
        {/* 底部装饰元素 - 进一步减小上边距 */}
        <div className="mt-2 pt-2 border-t border-pink-100 flex justify-end">
          <div className="text-xs text-gray-400 italic">
            AI生成于 {new Date().toLocaleDateString()}
          </div>
        </div>
      </div>
      
      {/* 分享按钮区域 - 减小内边距并紧凑化按钮 */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex flex-wrap justify-between items-center gap-2">
        <div className="flex space-x-2">
          <button 
            onClick={saveAsImage}
            className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-md shadow-sm hover:bg-gray-50 transition-colors flex items-center text-sm"
          >
            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            保存图片
          </button>
          
          <button 
            onClick={shareRoast}
            className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-md shadow-sm hover:bg-gray-50 transition-colors flex items-center text-sm"
          >
            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            复制链接
          </button>
        </div>
        
        <div className="text-xs text-gray-500">
          {shareId ? (
            <span>分享ID: {shareId}</span>
          ) : (
            <span>生成于 {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// 添加 RoastCard 组件定义
function RoastCard({ roast, router, formatDate }) {
  const handleClick = () => {
    if (roast.shareId) {
      router.push(`/?share=${roast.shareId}`);
    }
  };
  
  return (
    <div 
      className="bg-white overflow-hidden rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleClick}
    >
      <div className="p-4">
        <div className="flex items-center mb-3">
          <img 
            src={roast.blogger?.avatar || '/default-avatar.svg'} 
            alt={roast.blogger?.nickname || '博主'} 
            className="w-10 h-10 rounded-full mr-3"
            onError={handleImageError}
          />
          <div>
            <h3 className="font-medium text-gray-900">{roast.blogger?.nickname || '未知博主'}</h3>
            <p className="text-xs text-gray-500">{formatDate(roast.createdAt)}</p>
          </div>
        </div>
        
        <p className="text-gray-700 text-sm line-clamp-3 mb-2">
          {roast.roast.substring(0, 120)}...
        </p>
        
        <div className="text-xs text-rose-500 font-medium">
          点击查看完整吐槽
        </div>
      </div>
    </div>
  );
}

// 加载状态消息
const loadingMessages = [
  "AI正在卧底小红书...",
  "正在扫描博主的精修照片...",
  "解析博主的各种滤镜中...",
  "揭秘博主的真实状态...",
  "查询博主的种草套路...",
  "分析博主的营销话术...",
  "计算博主的夸张指数...",
  "检测博主的真实性分数...",
  "寻找博主的反差点...",
  "组装犀利吐槽中..."
];

const getRandomLoadingMessage = () => {
  return loadingMessages[Math.floor(Math.random() * loadingMessages.length)];
};

function Home() {
  const [url, setUrl] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [loadingMessage, setLoadingMessage] = useState<string>("");
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [bloggerInfo, setBloggerInfo] = useState<BloggerInfo | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const [recentRoasts, setRecentRoasts] = useState<RoastRecord[]>([]);
  const [lastDoc, setLastDoc] = useState<firebase.firestore.QueryDocumentSnapshot | null>(null);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentYear, setCurrentYear] = useState<number>(2025);
  const [mounted, setMounted] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [historyRoasts, setHistoryRoasts] = useState<RoastRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  
  const resultCardRef = useRef<HTMLDivElement>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const messageTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const router = useRouter();
  
  // 添加一个强制客户端渲染的效果
  useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date().toLocaleString('zh-CN'));
    setCurrentYear(new Date().getFullYear());
    initAnalytics();
  }, []);
  
  // 使用 useCallback 定义 loadRecentRoasts 函数，确保它在组件首次渲染时就可用
  const loadRecentRoasts = useCallback(async (isLoadMore = false) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true);
      }
      
      const result = await getRecentRoasts(isLoadMore ? lastDoc : null);
      
      if (isLoadMore) {
        setRecentRoasts(prev => [...prev, ...result.roasts]);
      } else {
        setRecentRoasts(result.roasts);
      }
      
      setLastDoc(result.lastDoc);
      setHasMore(result.roasts.length === 10);
      
    } catch (error) {
      console.error("加载最近吐槽失败:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [lastDoc]);
  
  // 添加一个回调函数来处理 searchParams
  const handleParamsLoad = useCallback((share: string | null) => {
    if (share) {
      loadSharedRoast(share);
    } else {
      // 加载最近的吐槽
      loadRecentRoasts();
    }
  }, []);
  
  // 加载分享的吐槽
  const loadSharedRoast = async (shareId: string) => {
    try {
      const roast = await getRoastByShareId(shareId);
      if (roast) {
        setResult(roast.roast);
        setBloggerInfo(roast.blogger);
        setShareId(roast.shareId || null);
        
        // 滚动到结果区域
        setTimeout(() => {
          const resultElement = document.getElementById('result-section');
          if (resultElement) {
            resultElement.scrollIntoView({ behavior: 'smooth' });
          }
        }, 500);
      }
    } catch (error) {
      console.error("加载分享吐槽失败:", error);
    }
  };
  
  // 处理加载更多
  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadRecentRoasts(true);
    }
  };

  // 启动加载动画
  const startLoadingAnimation = () => {
    // 初始化加载状态
    setLoadingProgress(0);
    setLoadingMessage(getRandomLoadingMessage());
    
    // 设置进度条定时器 - 模拟60秒的加载过程
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    progressTimerRef.current = setInterval(() => {
      setLoadingProgress(prev => {
        // 进度增加速度随时间减慢，最多到95%
        const newProgress = Math.min(prev + (100 - prev) / 50, 95);
        return newProgress;
      });
    }, 500);
    
    // 设置消息轮换定时器
    if (messageTimerRef.current) clearInterval(messageTimerRef.current);
    messageTimerRef.current = setInterval(() => {
      setLoadingMessage(getRandomLoadingMessage());
    }, 5000);
  };
  
  // 停止加载动画
  const stopLoadingAnimation = () => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    
    if (messageTimerRef.current) {
      clearInterval(messageTimerRef.current);
      messageTimerRef.current = null;
    }
    
    // 完成进度
    setLoadingProgress(100);
  };
  
  // 清理定时器
  useEffect(() => {
    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      if (messageTimerRef.current) clearInterval(messageTimerRef.current);
    };
  }, []);

  // 在顶部添加预加载逻辑
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 预加载默认头像 - 使用原生 Image 构造函数
      const img = new window.Image();
      img.src = "/default-avatar.svg";
      
      // 添加CSS规则来确保图片保存时的正确渲染
      const style = document.createElement('style');
      style.textContent = `
        @media print {
          .rounded-full { border-radius: 9999px; overflow: hidden; }
          .shadow-md { box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
        }
      `;
      document.head.appendChild(style);
      
      return () => {
        document.head.removeChild(style);
      };
    }
  }, []);

  // 添加一个格式化日期的函数
  const formatDate = useCallback((timestamp: number) => {
    return (
      <span suppressHydrationWarning>
        {new Date(timestamp).toLocaleString('zh-CN', {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </span>
    );
  }, []);

  // 修改分析函数以处理流式响应
  const analyzeProfile = async (url: string) => {
    try {
      setLoading(true);
      setLoadingMessage(getRandomLoadingMessage());
      setError("");
      startLoadingAnimation();
      
      console.log("开始分析小红书博主:", url);
      const startTime = Date.now();
      
      // 使用 fetch 发送请求到 API
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      
      console.log(`API响应状态: ${response.status}, 耗时: ${Date.now() - startTime}ms`);
      
      // 增加超时保护
      let responseData;
      try {
        responseData = await withTimeout(response.json(), 15000);
      } catch (jsonError) {
        console.error("解析API响应失败:", jsonError);
        throw new Error("服务器返回了无效的数据格式");
      }
      
      console.log("API响应数据类型:", typeof responseData);
      console.log("API响应是否成功:", responseData.success);
      
      if (!responseData.success) {
        console.error("API返回错误:", responseData.error);
        console.error("错误详情:", responseData.errorDetail);
        setError(responseData.error || "生成吐槽失败，请稍后再试");
        
        // 即使有错误也显示备用吐槽内容，但不保存到Firebase
        if (responseData.roast) {
          setResult(responseData.roast);
        }
        if (responseData.blogger) {
          setBloggerInfo(responseData.blogger);
        }
        return; // 提前返回，不保存错误结果
      }
      
      // 成功情况下更新状态
      setResult(responseData.roast);
      setBloggerInfo(responseData.blogger);
      
      // 检查是否包含错误信息，如果包含则不保存
      const containsErrorMessage = responseData.roast.includes("很抱歉，AI在生成吐槽时遇到了一些问题") || 
                                 responseData.roast.includes("处理请求时发生错误");
      
      // 只有生成成功且没有错误信息时才保存到Firebase
      if (!containsErrorMessage) {
        try {
          const saveStartTime = Date.now();
          console.log("开始保存吐槽到Firebase...");
          const newShareId = await saveRoast({
            blogger: responseData.blogger,
            roast: responseData.roast,
            url: url
          });
          console.log(`保存到Firebase完成, 耗时: ${Date.now() - saveStartTime}ms, ShareID: ${newShareId}`);
          setShareId(newShareId);
        } catch (saveError) {
          console.error("保存吐槽记录失败:", saveError);
        }
      } else {
        console.log("检测到错误信息，不保存到Firebase");
      }
      
    } catch (error) {
      console.error("分析博主失败:", error);
      setError((error as Error).message || "发生未知错误，请稍后重试");
    } finally {
      // 确保无论何种情况都停止加载动画和重置加载状态
      stopLoadingAnimation();
      setLoading(false);
      // 额外保障：添加一个超时，确保界面更新
      setTimeout(() => {
        if (loadingProgress !== 0) setLoadingProgress(0);
        if (loading) setLoading(false);
      }, 500);
    }
  };

  // 添加表单提交处理函数
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 验证输入
    if (!url.includes("xiaohongshu.com")) {
      setError("请输入有效的小红书链接");
      return;
    }
    
    // 重置状态
    setResult("");
    setBloggerInfo(null);
    setShareId(null);
    
    // 调用分析函数
    analyzeProfile(url);
  };

  // 修正图片保存功能，解决布局问题
  const saveAsImage = async () => {
    if (!resultCardRef.current) return;
    
    try {
      // 显示加载提示
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity opacity-0';
      notification.textContent = '正在生成图片，请稍候...';
      document.body.appendChild(notification);
      setTimeout(() => notification.classList.add('opacity-100'), 10);
      
      // 创建一个新的文档片段
      const tempContainer = document.createElement('div');
      tempContainer.className = 'fixed top-0 left-0 transform translate-x-[-9999px]';
      document.body.appendChild(tempContainer);
      
      // 添加更精确的样式控制
      const style = document.createElement('style');
      style.textContent = `
        .image-card {
          width: ${resultCardRef.current.offsetWidth}px;
          background: white;
          border-radius: 16px;
          padding: 24px;
          font-family: ui-sans-serif, system-ui, sans-serif;
          color: #1f2937;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        .image-card .header {
          display: flex;
          align-items: flex-start;
          margin-bottom: 20px;
        }
        .image-card .avatar {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          overflow: hidden;
          margin-right: 12px;
          flex-shrink: 0;
          border: 1px solid #FCE7F3;
        }
        .image-card .avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .image-card .blogger-info {
          flex: 1;
        }
        .image-card .blogger-name {
          font-size: 18px;
          font-weight: 700;
          color: #111827;
          margin-bottom: 4px;
          line-height: 1.2;
        }
        .image-card .blogger-status {
          font-size: 14px;
          color: #EC4899;
          font-weight: 500;
        }
        .image-card .content {
          padding: 8px 0;
          line-height: 1.6;
          white-space: pre-wrap;
        }
        .image-card .title {
          font-size: 18px;
          font-weight: 700;
          color: #E11D48;
          margin-top: 16px;
          margin-bottom: 8px;
        }
        .image-card p {
          margin-bottom: 12px;
        }
        .image-card .footer {
          margin-top: 24px;
          padding-top: 16px;
          border-top: 1px solid #F3F4F6;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .image-card .time {
          font-size: 14px;
          color: #6B7280;
          display: flex;
          align-items: center;
        }
        .image-card .time svg {
          width: 16px;
          height: 16px;
          margin-right: 4px;
        }
        .image-card .creator-info {
          display: flex;
          align-items: center;
        }
        .image-card .creator-label {
          font-size: 12px;
          color: #9CA3AF;
          margin-right: 8px;
        }
        .image-card .creator-avatar {
          width: 20px;
          height: 20px;
          border-radius: 9999px;
          margin-right: 4px;
        }
        .image-card .creator-name {
          font-size: 12px;
          color: #4B5563;
          font-weight: 500;
        }
      `;
      tempContainer.appendChild(style);
      
      // 构建自定义标记结构，不使用原始DOM的克隆
      const imageCard = document.createElement('div');
      imageCard.className = 'image-card';
      
      // 博主信息
      const header = document.createElement('div');
      header.className = 'header';
      
      const avatarContainer = document.createElement('div');
      avatarContainer.className = 'avatar';
      const avatarImg = document.createElement('img');
      avatarImg.src = bloggerInfo?.avatar || '/default-avatar.svg';
      avatarImg.alt = bloggerInfo?.nickname || '未知博主';
      avatarImg.crossOrigin = 'anonymous';
      avatarImg.onerror = () => { avatarImg.src = '/default-avatar.svg'; };
      avatarContainer.appendChild(avatarImg);
      
      const bloggerInfoDiv = document.createElement('div');
      bloggerInfoDiv.className = 'blogger-info';
      
      const bloggerName = document.createElement('h3');
      bloggerName.className = 'blogger-name';
      bloggerName.textContent = bloggerInfo?.nickname || '未知博主';
      
      const status = document.createElement('p');
      status.className = 'blogger-status';
      status.textContent = '被DeepSeek花式吐槽中...';
      
      bloggerInfoDiv.appendChild(bloggerName);
      bloggerInfoDiv.appendChild(status);
      
      header.appendChild(avatarContainer);
      header.appendChild(bloggerInfoDiv);
      imageCard.appendChild(header);
      
      // 内容
      const content = document.createElement('div');
      content.className = 'content';
      
      result.split('\n').forEach(line => {
        if (line.trim()) {
          // 处理 markdown 格式 - 与页面展示保持一致
          const formattedLine = line
            // 标题和重点强调
            .replace(/【(.+?)】/g, '<span style="font-weight:bold;color:#e11d48;">【$1】</span>')
            // 加粗文字转为橙色强调
            .replace(/\*\*(.+?)\*\*/g, '<span style="font-weight:600;color:#d97706;">$1</span>')
            // 下划线文字
            .replace(/\_\_(.+?)\_\_/g, '<span style="text-decoration:underline;text-decoration-color:#ec4899;text-decoration-thickness:2px;">$1</span>')
            // 斜体转为紫色强调
            .replace(/\*(.+?)\*/g, '<span style="font-style:italic;color:#9333ea;">$1</span>')
            // 引用转为灰底黑字
            .replace(/\>(.+)/g, '<span style="background-color:#f3f4f6;color:#1f2937;padding:4px 8px;border-radius:4px;">$1</span>');
          
          if (line.trim().startsWith('【') && line.trim().includes('】')) {
            const heading = document.createElement('h4');
            heading.className = 'title';
            heading.innerHTML = formattedLine;
            content.appendChild(heading);
          } else {
            const p = document.createElement('p');
            p.innerHTML = formattedLine;
            content.appendChild(p);
          }
        } else {
          const spacer = document.createElement('div');
          spacer.style.height = '8px';
          content.appendChild(spacer);
        }
      });
      
      imageCard.appendChild(content);
      
      // 底部信息 - 只添加一个创作者信息
      const footer = document.createElement('div');
      footer.className = 'footer';
      
      const timeDiv = document.createElement('div');
      timeDiv.className = 'time';
      timeDiv.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
        </svg>
        <span>生成于 ${currentTime}</span>
      `;
      
      const creatorDiv = document.createElement('div');
      creatorDiv.className = 'creator-info';
      creatorDiv.innerHTML = `
        <span class="creator-label">Powered by</span>
        <img src="/花叔.webp" alt="花叔" class="creator-avatar" />
        <span class="creator-name">花叔（只工作不上班版</span>
      `;
      
      footer.appendChild(timeDiv);
      footer.appendChild(creatorDiv);
      imageCard.appendChild(footer);
      
      tempContainer.appendChild(imageCard);
      
      // 找到所有图片并等待加载完成
      const images = imageCard.querySelectorAll('img');
      await Promise.all(Array.from(images).map(img => {
        // 对于头像图片特殊处理
        if (img.src.includes('sns-avatar') || img.src.includes('xhscdn.com')) {
          // 设置跨域属性
          img.crossOrigin = 'anonymous';
          
          // 创建一个备用的头像URL，以防加载失败
          const originalSrc = img.src;
          
          return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = () => {
              console.warn('头像加载失败，使用默认头像', originalSrc);
              img.src = '/default-avatar.svg';
              resolve();
            };
            // 触发加载
            img.src = originalSrc;
          });
        }
        
        // 非头像图片正常处理
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      }));
      
      // 使用html2canvas生成图片
      const canvas = await html2canvas(imageCard, {
        scale: 2, // 提高清晰度
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });
      
      // 移除加载提示
      notification.classList.remove('opacity-100');
      setTimeout(() => document.body.removeChild(notification), 300);
      
      // 检测是否是移动设备
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      if (isMobile) {
        // 移动设备：显示图片弹窗，用户可以长按保存
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4';
        overlay.onclick = (e) => {
          if (e.target === overlay) {
            document.body.removeChild(overlay);
          }
        };
        
        const imageContainer = document.createElement('div');
        imageContainer.className = 'max-w-full max-h-full relative';
        
        const img = document.createElement('img');
        img.src = canvas.toDataURL('image/png');
        img.className = 'max-w-full max-h-[80vh] rounded-lg shadow-lg';
        
        const infoText = document.createElement('p');
        infoText.className = 'text-white text-center text-sm mt-4';
        infoText.textContent = '长按图片保存到相册';
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2';
        closeBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        `;
        closeBtn.onclick = () => document.body.removeChild(overlay);
        
        imageContainer.appendChild(img);
        imageContainer.appendChild(closeBtn);
        overlay.appendChild(imageContainer);
        overlay.appendChild(infoText);
        document.body.appendChild(overlay);
      } else {
        // 桌面设备：下载图片
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = `${bloggerInfo?.nickname || '未知博主'}_吐槽.png`;
        a.click();
        
        // 显示成功提示
        const successNotification = document.createElement('div');
        successNotification.className = 'fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg opacity-0 transition-opacity';
        successNotification.textContent = '图片已保存';
        document.body.appendChild(successNotification);
        setTimeout(() => successNotification.classList.add('opacity-100'), 10);
        setTimeout(() => {
          successNotification.classList.remove('opacity-100');
          setTimeout(() => document.body.removeChild(successNotification), 300);
        }, 2000);
      }
      
      // 清理
      document.body.removeChild(tempContainer);
      
    } catch (error) {
      console.error('保存图片失败:', error);
      alert('保存图片失败，请稍后再试');
    }
  };

  // 分享吐槽
  const shareRoast = () => {
    if (!shareId) return;
    
    // 构建分享链接
    const shareUrl = `${window.location.origin}/?share=${shareId}`;
    
    // 直接复制到剪贴板
    copyToClipboard(shareUrl);
  };
  
  // 复制到剪贴板并显示通知
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    
    const notification = document.createElement('div');
    notification.className = 'fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg opacity-0 transition-opacity';
    notification.textContent = '分享链接已复制到剪贴板';
    document.body.appendChild(notification);
    setTimeout(() => notification.classList.add('opacity-100'), 10);
    setTimeout(() => {
      notification.classList.remove('opacity-100');
      setTimeout(() => document.body.removeChild(notification), 300);
    }, 2000);
  };

  // 加载历史吐槽记录的函数
  const loadBloggerHistory = async (bloggerId: string) => {
    if (!bloggerId) return;
    
    try {
      setLoadingHistory(true);
      const history = await getBloggerRoastHistory(bloggerId);
      setHistoryRoasts(history);
    } catch (error) {
      console.error("加载博主历史吐槽失败:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // 修改打开历史模态框的处理程序
  const handleOpenHistoryModal = (bloggerId: string) => {
    setShowHistoryModal(true);
    loadBloggerHistory(bloggerId);
  };

  // 如果没有挂载，返回一个简单的加载状态
  if (!mounted) {
    return null; // 返回 null 而不是加载界面，可以避免闪烁
  }
  
  // 返回完整的UI
  return (
    <ClientOnlyWrapper>
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-pink-50">
        <Suspense fallback={null}>
          <SearchParamsComponent onParamsLoad={handleParamsLoad} />
        </Suspense>

        <header className="bg-gradient-to-r from-rose-500 to-pink-600 sticky top-0 z-10 shadow-md">
          <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-white flex items-center">
              <img src="/logo.svg" alt="红薯吐槽机" className="w-8 h-8 mr-2" />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-100 to-white">
                红薯吐槽机
              </span>
            </h1>
            <a 
              href="https://github.com/yourusername/xiaohongshu-roast"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:text-pink-100 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.032 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"></path>
              </svg>
            </a>
          </div>
        </header>

        <main className="flex-1 py-10">
          <div className="max-w-5xl mx-auto px-4 space-y-8">
            
            {!loading && !result && !error && (
              <div className="text-center mb-10">
                <h2 className="text-3xl font-bold text-gray-800 mb-4">用AI把<span className="text-pink-600">小红书博主</span>吐槽到体无完肤</h2>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  复制一个小红书博主页面链接，我们的AI会自动分析博主内容并生成一段犀利有趣的吐槽
                </p>
              </div>
            )}
            
            {!loading && !result && (
              <div className="bg-gradient-to-br from-rose-50 via-pink-50 to-white rounded-2xl p-6 shadow-lg border border-pink-100 relative overflow-hidden">
                <div className="absolute -top-16 -right-16 w-32 h-32 bg-gradient-to-br from-pink-200 to-pink-100 rounded-full opacity-60"></div>
                <div className="absolute -bottom-12 -left-12 w-24 h-24 bg-gradient-to-br from-rose-200 to-pink-100 rounded-full opacity-50"></div>
                
                <h2 className="text-2xl font-bold text-gray-800 mb-4 relative z-10">
                  博主灵魂透视
                </h2>
                <p className="text-gray-600 mb-6 relative z-10">
                  AI自动读取博主内容，一键生成毒舌吐槽，让红薯博主现出原形
                </p>
                
                <form onSubmit={handleSubmit} className="relative z-10">
                  <div className="relative">
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="粘贴小红书博主链接，AI来毒舌"
                      className="w-full p-4 pr-24 rounded-xl border-2 border-pink-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-200 focus:outline-none transition-all shadow-sm text-gray-700 placeholder-gray-400"
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className={`absolute right-2 top-2 px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-600 text-white font-medium rounded-lg shadow hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      {loading ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          生成中
                        </span>
                      ) : '开始吐槽'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 ml-1">支持小红书博主主页链接，例如: https://www.xiaohongshu.com/user/profile/123456</p>
                </form>
              </div>
            )}
            
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}
            
            {loading && (
              <div className="bg-white rounded-2xl shadow-lg p-8 relative overflow-hidden border border-pink-100">
                <div className="absolute inset-0 bg-gradient-to-br from-rose-50 to-white opacity-70"></div>
                
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-20 h-20 mb-6 relative">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-rose-400 to-pink-500 animate-pulse"></div>
                    <div className="absolute inset-2 rounded-full bg-white flex items-center justify-center">
                      <svg className="w-10 h-10 text-pink-500 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-800 mb-2">深度解析中</h3>
                  <p className="text-pink-600 font-medium mb-4 min-h-[24px]">{loadingMessage || loadingMessages[Math.floor(Math.random() * loadingMessages.length)]}</p>
                  
                  <div className="w-full max-w-md h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-rose-400 to-pink-500 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${loadingProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-gray-500 text-sm mt-2">{loadingProgress}% 完成</p>
                  
                  <p className="text-gray-600 text-sm mt-6 text-center max-w-md">
                    请耐心等待，AI正在尽情发挥创意，为您带来最犀利、最有趣的吐槽
                  </p>
                </div>
              </div>
            )}
            
            {!loading && result && bloggerInfo && (
              <ResultCard 
                bloggerInfo={bloggerInfo}
                url={url}
                result={result}
                resultCardRef={resultCardRef}
                saveAsImage={saveAsImage}
                shareRoast={shareRoast}
                handleOpenHistoryModal={handleOpenHistoryModal}
                shareId={shareId}
              />
            )}
            
            {recentRoasts.length > 0 && (
              <div className="mt-12 pt-8 border-t border-pink-100">
                <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                  <svg className="w-6 h-6 mr-2 text-pink-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"></path>
                  </svg>
                  最新吐槽
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recentRoasts.map(roast => (
                    <RoastCard 
                      key={roast.id}
                      roast={roast}
                      router={router}
                      formatDate={formatDate}
                    />
                  ))}
                </div>
                
                {hasMore && (
                  <div className="mt-8 text-center">
                    <button
                      onClick={() => loadRecentRoasts(true)}
                      disabled={loadingMore}
                      className="px-6 py-2.5 bg-white border border-pink-300 text-pink-600 rounded-lg shadow-sm hover:bg-pink-50 transition-colors font-medium"
                    >
                      {loadingMore ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-pink-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          加载中...
                        </span>
                      ) : '查看更多吐槽'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </ClientOnlyWrapper>
  );
}

export default Home; 