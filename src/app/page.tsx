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

  // 随机加载消息数组
  const loadingMessages = [
    "正在分析博主的精彩内容...",
    "AI正在思考犀利的吐槽...",
    "正在生成有趣的评论...",
    "AI正在整理语言，请稍等...",
    "正在为您定制个性化吐槽...",
    "分析已完成60%，请再等一下...",
    "AI正在发挥创意，马上就好...",
    "正在查找博主的特点，这需要一点时间...",
    "好的吐槽需要一点时间酝酿...",
    "正在酝酿妙语连珠的评论...",
    "创意需要时间，请稍等片刻...",
    "我们正在为您创作最有趣的吐槽...",
  ];

  // 随机选择一条加载消息
  const getRandomLoadingMessage = () => {
    return loadingMessages[Math.floor(Math.random() * loadingMessages.length)];
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
      
      const responseData = await response.json();
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
      stopLoadingAnimation();
      setLoading(false);
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
    if (shareId) {
      const shareUrl = `${window.location.origin}?share=${shareId}`;
      
      if (navigator.share) {
        navigator.share({
          title: `${bloggerInfo?.nickname || '小红书博主'}的AI吐槽`,
          text: `看看AI是怎么吐槽${bloggerInfo?.nickname || '这位小红书博主'}的！`,
          url: shareUrl
        }).catch(err => {
          console.error('分享失败:', err);
          copyToClipboard(shareUrl);
        });
      } else {
        copyToClipboard(shareUrl);
      }
    }
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

  // 如果没有挂载，返回一个简单的加载状态
  if (!mounted) {
    return null; // 返回 null 而不是加载界面，可以避免闪烁
  }
  
  // 返回完整的UI
  return (
    <ClientOnlyWrapper>
      <div className="min-h-screen bg-[#f5f5f7] flex flex-col">
        {/* 添加 Suspense 包裹 SearchParamsComponent */}
        <Suspense fallback={null}>
          <SearchParamsComponent onParamsLoad={handleParamsLoad} />
        </Suspense>

        {/* 苹果风格的顶部导航栏 */}
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-10 border-b border-gray-100">
          <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-xl font-medium text-gray-900">
              <span className="text-red-500">小红书</span>博主吐槽助手
            </h1>
            <a 
              href="https://github.com/alchaincyf/xiaohongshu_roast" 
              className="text-gray-500 hover:text-gray-700 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"></path>
              </svg>
            </a>
          </div>
        </header>

        <main className="flex-1 py-8">
          <div className="max-w-4xl mx-auto px-4">
            {/* 输入区域 - 苹果风格卡片 */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-8">
              <div className="p-6">
                <h2 className="text-center text-2xl font-medium text-gray-900 mb-6">
                  输入小红书博主链接，生成幽默吐槽
                </h2>
                
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="relative rounded-xl shadow-sm">
                    <input
                      type="text"
                      id="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://www.xiaohongshu.com/user/profile/..."
                      className="block w-full rounded-xl border-0 py-3.5 px-4 text-gray-900 ring-1 ring-inset ring-gray-200 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-red-500 sm:text-sm sm:leading-6 transition-all"
                      required
                    />
                    {url && (
                      <button
                        type="button"
                        onClick={() => setUrl("")}
                        className="absolute inset-y-0 right-0 flex items-center pr-3"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-gray-400 hover:text-gray-500">
                          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 6.28 5.22z" />
                        </svg>
                      </button>
                    )}
                  </div>
                  
                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-white bg-red-500 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {loading ? 
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        分析中...
                      </span> 
                      : '生成吐槽' 
                    }
                  </button>
                </form>
              </div>
              
              {/* 加载状态区域 - 苹果风格进度指示器 */}
              {loading && (
                <div className="px-6 pb-6 animate-fade-in">
                  <div className="flex flex-col items-center space-y-5">
                    <div className="w-full bg-gray-100 rounded-full h-1 overflow-hidden">
                      <div 
                        className="bg-red-500 h-full rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${loadingProgress}%` }}
                      />
                    </div>
                    
                    <div className="flex items-center">
                      <div className="animate-spin mr-3 h-5 w-5 text-red-500">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">{loadingMessage}</p>
                        <p className="text-xs text-gray-500 mt-0.5">预计总共需要约60秒...</p>
                      </div>
                    </div>
                    
                    <div className="w-full p-4 bg-amber-50 rounded-xl border border-amber-100 text-sm">
                      <p className="flex items-start text-amber-800">
                        <svg className="w-5 h-5 text-amber-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <span>
                          别着急，DeepSeek正在疯狂思考中，请耐心等待。这段时间适合喝口水、放松一下眼睛。
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 错误提示区域 - 苹果风格警告 */}
            {error && (
              <div className="mb-8 bg-red-50 border-l-4 border-red-500 rounded-lg overflow-hidden animate-fade-in">
                <div className="p-4 flex items-start">
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

            {/* 结果展示区域 - 苹果风格卡片 */}
            {result && (
              <div className="animate-fade-in">
                <div 
                  ref={resultCardRef}
                  className="bg-white rounded-2xl shadow-md overflow-hidden p-6 transition-all hover:shadow-lg border border-pink-50"
                  data-result-card
                >
                  {/* 可点击的博主信息栏 */}
                  <div className="flex items-start mb-5">
                    <a 
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block h-12 w-12 rounded-xl overflow-hidden flex-shrink-0 mr-3 border border-pink-100 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <NextImage 
                        src={bloggerInfo?.avatar || '/default-avatar.svg'} 
                        alt={`${bloggerInfo?.nickname || '未知博主'}的头像`}
                        className="h-full w-full object-cover"
                        crossOrigin="anonymous"
                        width={48}
                        height={48}
                        onError={(e) => {
                          e.currentTarget.src = "/default-avatar.svg";
                        }}
                      />
                    </a>
                    <div className="flex-1">
                      <a 
                        href={url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <h3 className="text-lg font-bold text-gray-900 mb-1 leading-tight hover:text-red-500 transition-colors">
                          {bloggerInfo?.nickname || '未知博主'}
                        </h3>
                      </a>
                      <p className="text-sm text-pink-500 font-medium">被DeepSeek花式吐槽中...</p>
                    </div>
                  </div>
                  
                  {/* 美化后的吐槽内容 */}
                  <div className="py-2 prose prose-pink max-w-none text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {result.split('\n').map((line, i) => {
                      // 增强富文本格式化 - 多种颜色和样式
                      const formattedLine = line
                        // 标题和重点强调
                        .replace(/【(.+?)】/g, '<span class="font-bold text-red-600">【$1】</span>')
                        // 加粗文字转为橙色强调
                        .replace(/\*\*(.+?)\*\*/g, '<span class="font-semibold text-amber-600">$1</span>')
                        // 下划线文字
                        .replace(/\_\_(.+?)\_\_/g, '<span class="underline decoration-pink-500 decoration-2">$1</span>')
                        // 斜体转为紫色强调
                        .replace(/\*(.+?)\*/g, '<span class="italic text-purple-600">$1</span>')
                        // 引用转为灰底黑字
                        .replace(/\>(.+)/g, '<span class="bg-gray-100 text-gray-800 px-2 py-1 rounded">$1</span>');
                        
                      if (line.trim().startsWith('【') && line.trim().includes('】')) {
                        return <h4 key={i} className="text-red-600 font-bold text-lg mt-4 mb-2" dangerouslySetInnerHTML={{__html: formattedLine}} />;
                      } else if (line.trim()) {
                        return <p key={i} className="mb-3" dangerouslySetInnerHTML={{__html: formattedLine}} />;
                      }
                      // 空行
                      return <div key={i} className="h-2" />;
                    })}
                  </div>
                  
                  {/* 底部信息区域 */}
                  <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center">
                    <p className="text-sm text-gray-500 flex time-display items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1 flex-shrink-0">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      <span suppressHydrationWarning>生成于 {currentTime}</span>
                    </p>
                    
                    {/* 创作者信息 */}
                    <div className="flex items-center">
                      <span className="text-xs text-gray-400 mr-2">Powered by</span>
                      <img src="/花叔.webp" alt="花叔" className="w-5 h-5 rounded-full mr-1" />
                      <span className="text-xs font-medium text-gray-600">花叔（只工作不上班版</span>
                    </div>
                  </div>
                  
                  {/* 底部操作区域 */}
                  <div className="mt-4 flex space-x-2 result-actions">
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(result);
                        // 使用更现代的提示方式
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
                      className="flex items-center px-3 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300 text-sm font-medium"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1">
                        <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z" />
                        <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zM15 11h2a1 1 0 110 2h-2v-2z" />
                      </svg>
                      复制内容
                    </button>
                    <button 
                      onClick={saveAsImage}
                      className="flex items-center px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-300 text-sm font-medium"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1">
                        <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                      </svg>
                      保存为图片
                    </button>
                    {bloggerInfo?.bloggerId && (
                      <button
                        className="text-sm px-3 py-1.5 bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 transition-colors flex items-center"
                        onClick={() => setShowHistoryModal(true)}
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        历史吐槽
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 最近吐槽展示区域 */}
            {recentRoasts.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-8">
                <div className="p-6">
                  <h2 className="text-xl font-medium text-gray-900 mb-6">最近的吐槽</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {recentRoasts.map((roast) => (
                      <div 
                        key={roast.id} 
                        className="border border-pink-100 rounded-xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer bg-white"
                        onClick={() => {
                          if (roast.shareId) {
                            router.push(`?share=${roast.shareId}`);
                          }
                        }}
                      >
                        <div className="bg-gradient-to-r from-pink-50 to-white p-4 flex items-center">
                          <a 
                            href={roast.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block h-10 w-10 rounded-full overflow-hidden flex-shrink-0 border border-pink-100 shadow-sm hover:shadow-md transition-shadow"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <NextImage 
                              src={roast.blogger.avatar} 
                              alt={`${roast.blogger.nickname}的头像`}
                              className="h-full w-full object-cover"
                              crossOrigin="anonymous"
                              width={40}
                              height={40}
                              onError={(e) => {
                                e.currentTarget.src = "/default-avatar.svg";
                              }}
                            />
                          </a>
                          <div className="ml-3 flex-1 truncate">
                            <a 
                              href={roast.url} 
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <h3 className="text-sm font-medium text-gray-900 hover:text-red-500 transition-colors">{roast.blogger.nickname}</h3>
                            </a>
                            <p className="text-xs text-gray-500">
                              {formatDate(roast.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="p-4">
                          <p className="text-sm text-gray-700 line-clamp-3">
                            {roast.roast.split('\n')[0]}
                          </p>
                        </div>
                        {/* 添加创作者标记 */}
                        <div className="px-4 pb-3 pt-1 border-t border-pink-50 flex justify-end items-center">
                          <span className="text-xs text-gray-400 mr-1">Powered by</span>
                          <img src="/花叔.webp" alt="花叔" className="w-4 h-4 rounded-full mr-1" />
                          <span className="text-xs text-gray-500">花叔</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {hasMore && (
                    <div className="mt-6 text-center">
                      <button
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                        className={`px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${loadingMore ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {loadingMore ? '加载中...' : '加载更多'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 使用说明区域 - 苹果风格卡片 */}
            <div className="mt-8 bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">使用说明</h2>
              <ol className="list-decimal pl-5 space-y-2 text-gray-700">
                <li>复制小红书博主的主页链接（例如：https://www.xiaohongshu.com/user/profile/...）</li>
                <li>粘贴到上方输入框</li>
                <li>点击&quot;生成吐槽&quot;按钮</li>
                <li>等待AI分析完成，查看幽默吐槽结果</li>
              </ol>
              <p className="mt-4 text-sm text-gray-500">注意：本工具仅供娱乐，请文明使用，勿用于攻击他人。</p>
            </div>
          </div>
        </main>

        <footer className="bg-white border-t border-gray-200 py-4 mt-8">
          <div className="max-w-4xl mx-auto px-4">
            <p className="text-center text-sm text-gray-500" suppressHydrationWarning>
              © {currentYear} 小红书博主吐槽助手 - 本网站仅供娱乐
            </p>
          </div>
        </footer>

        <style jsx>{`
          @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          .animate-fade-in {
            animation: fade-in 0.5s ease-in-out;
          }
          
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
          }
          
          .animate-pulse {
            animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
          
          .line-clamp-3 {
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
        `}</style>
      </div>
    </ClientOnlyWrapper>
  );
}

export default Home; 