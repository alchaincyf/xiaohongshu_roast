import { NextRequest, NextResponse } from 'next/server';

/**
 * 使用r.jina.ai爬取小红书博主页面内容，直接返回原始HTML
 */
async function fetchRawXiaohongshuContent(url: string): Promise<string> {
  try {
    // 移除URL中可能存在的多余协议前缀
    let cleanUrl = url;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      // 如果用户提供的URL已经包含协议前缀，则不再添加
      cleanUrl = url.replace(/^https?:\/\//, '');
    }
    
    // 构建r.jina.ai的URL
    const jinaUrl = `https://r.jina.ai/${cleanUrl}`;
    console.log('爬取内容，使用URL:', jinaUrl);
    
    // 发送请求获取小红书内容
    const response = await fetch(jinaUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch content: ${response.status}`);
    }
    
    const html = await response.text();
    console.log('成功获取到原始HTML内容，长度:', html.length);
    
    return html;
  } catch (error) {
    console.error('Error fetching Xiaohongshu content:', error);
    throw new Error('无法获取小红书内容，请检查链接是否有效');
  }
}

/**
 * 调用DeepSeek API进行幽默吐槽
 */
async function generateRoast(blogContent: string): Promise<string> {
  console.log("调用DeepSeek API开始...");
  const apiKey = process.env.DEEPSEEK_API_KEY;
  
  if (!apiKey) {
    console.error("未找到DeepSeek API密钥!");
    throw new Error("缺少DeepSeek API密钥");
  }
  
  // 清理内容，移除链接和不必要元素
  const cleanedContent = cleanContentForAI(blogContent);
  console.log("清理前内容长度:", blogContent.length, "清理后:", cleanedContent.length);
  
  try {
    const requestBody = {
      model: 'deepseek-reasoner',
      messages: [
        {
          role: 'user',
          content: `roast这位小红书博主（直接roast，不要说任何多余的话，角度需要多样和犀利）:

使用以下 Markdown 格式增强表现力:
1. 【标题】使用【】括起重要段落标题
2. **加粗** 用于强调重要观点

以下是博主内容：\n\n${cleanedContent.substring(0, 18000)}`
        }
      ],
      temperature: 0.7,
      max_tokens: 4000
    };
    
    console.log("开始发送请求到DeepSeek API...");
    const requestStartTime = Date.now();
    
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log(`DeepSeek API响应状态: ${response.status}, 耗时: ${Date.now() - requestStartTime}ms`);
    
    // 获取原始响应文本
    const responseText = await response.text();
    
    // 先检查响应是否为空
    if (!responseText || responseText.trim() === '') {
      console.error("DeepSeek API返回空响应");
      throw new Error("API返回空响应");
    }
    
    // 记录原始响应用于调试
    console.log("原始响应 (前200字符):", responseText.substring(0, 200));
    
    // 尝试解析JSON
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      console.error("解析响应JSON失败:", parseError, "原始响应:", responseText);
      
      // 检查是否包含错误信息
      if (responseText.includes("error") || responseText.includes("An error occurred")) {
        throw new Error(`API返回错误: ${responseText.substring(0, 200)}`);
      }
      
      // 如果看起来像是直接返回的文本内容而不是JSON
      if (responseText.includes("【") || responseText.includes("**")) {
        console.log("API似乎直接返回了文本内容而非JSON");
        return responseText;
      }
      
      throw new Error("无法解析API响应");
    }
    
    // 验证响应数据结构
    if (!responseData.choices || !responseData.choices[0] || !responseData.choices[0].message) {
      console.error("API响应缺少必要字段:", responseData);
      throw new Error("API响应格式不正确");
    }
    
    return responseData.choices[0].message.content;
    
  } catch (error) {
    console.error("调用DeepSeek API时发生错误:", error);
    throw error;
  }
}

/**
 * 清理HTML/Markdown内容，移除链接和不必要元素
 */
function cleanContentForAI(content: string): string {
  // 保存开始处理时间
  const startTime = Date.now();
  
  let cleanedContent = content;
  
  // 1. 移除Markdown链接，保留链接文本 [text](url) -> text
  cleanedContent = cleanedContent.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  
  // 2. 移除Markdown图片 ![alt](url) -> alt
  cleanedContent = cleanedContent.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');
  
  // 3. 移除所有URL (http/https)
  cleanedContent = cleanedContent.replace(/https?:\/\/[^\s<>"']+/g, '');
  
  // 4. 移除URL参数组合 (?xsec_token=等)
  cleanedContent = cleanedContent.replace(/\?[^\s<>"']+/g, '');
  
  // 5. 移除网页特殊格式标记 imageView2, format=webp等
  cleanedContent = cleanedContent.replace(/\|imageView2[^\s<>"']+/g, '');
  cleanedContent = cleanedContent.replace(/\?imageView2[^\s<>"']+/g, '');
  
  // 6. 移除连续多个空行，保留一个空行
  cleanedContent = cleanedContent.replace(/\n{3,}/g, '\n\n');
  
  // 记录处理时间和减少的内容长度
  const processTime = Date.now() - startTime;
  const reductionPercent = ((content.length - cleanedContent.length) / content.length * 100).toFixed(2);
  console.log(`内容清理完成: ${processTime}ms, 减少长度: ${content.length - cleanedContent.length}字符 (${reductionPercent}%)`);
  
  return cleanedContent;
}

// 确保使用 Edge Runtime
export const runtime = 'edge';

// 设置最大执行时间
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  console.log("API请求开始 - ", new Date().toISOString());
  
  try {
    const startTime = Date.now();
    const requestData = await request.json();
    console.log("请求数据解析完成:", JSON.stringify({
      url: requestData.url,
      timestamp: new Date().toISOString(),
      parseTime: Date.now() - startTime
    }));
    
    const url = requestData.url;
    
    // 爬取内容
    console.log("开始爬取小红书内容...");
    let html;
    try {
      const fetchStartTime = Date.now();
      html = await fetchRawXiaohongshuContent(url);
      console.log(`爬取内容完成: ${Date.now() - fetchStartTime}ms, 内容长度: ${html?.length || 0}`);
    } catch (fetchError) {
      console.error("爬取内容失败:", fetchError);
      return NextResponse.json({
        success: false,
        error: fetchError instanceof Error ? fetchError.message : "爬取小红书内容失败",
        errorDetail: JSON.stringify(fetchError)
      }, { status: 200 }); // 返回200避免501错误
    }
    
    // 提取博主信息
    console.log("开始提取博主信息...");
    let bloggerInfo;
    try {
      const extractStartTime = Date.now();
      bloggerInfo = extractBloggerInfo(html);
      console.log(`提取博主信息完成: ${Date.now() - extractStartTime}ms, 信息:`, JSON.stringify(bloggerInfo));
    } catch (extractError) {
      console.error("提取博主信息失败:", extractError);
      return NextResponse.json({
        success: false,
        error: "提取博主信息失败",
        errorDetail: JSON.stringify(extractError)
      }, { status: 200 });
    }
    
    // 清理内容
    console.log("开始清理内容...");
    let cleanedContent;
    try {
      const cleanStartTime = Date.now();
      cleanedContent = cleanContentForAI(html);
      console.log(`内容清理完成: ${Date.now() - cleanStartTime}ms, 清理后长度: ${cleanedContent?.length || 0}`);
    } catch (cleanError) {
      console.error("清理内容失败:", cleanError);
      return NextResponse.json({
        success: false,
        error: "清理内容失败",
        errorDetail: JSON.stringify(cleanError)
      }, { status: 200 });
    }
    
    // 生成吐槽 - 添加重试机制
    console.log("开始调用AI生成吐槽...");
    let roast;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        attempts++;
        const aiStartTime = Date.now();
        roast = await generateRoast(cleanedContent);
        console.log(`AI生成吐槽完成: ${Date.now() - aiStartTime}ms, 内容长度: ${roast?.length || 0}`);
        break; // 成功则跳出循环
      } catch (aiError) {
        console.error(`生成吐槽失败 (尝试 ${attempts}/${maxAttempts}):`, aiError);
        
        if (attempts >= maxAttempts) {
          return NextResponse.json({
            success: false,
            error: "多次尝试生成吐槽均失败",
            errorDetail: JSON.stringify(aiError),
            blogger: bloggerInfo,
            roast: `很抱歉，AI在生成吐槽时遇到了一些问题。\n\n【关于这位博主】\n这位小红书博主看起来很有趣，但AI在处理时遇到了一些挑战。\n\n【吐槽】\nAI也有出错的时候，就像那些经常"翻车"的网红博主一样。不过，与其沮丧，不如再试一次！毕竟，在互联网的世界里，重新加载页面解决90%的问题。\n\n希望下次能为您提供一个精彩的吐槽！`
          }, { status: 200 });
        }
        
        // 等待一小段时间后重试
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log(`重试生成吐槽 (${attempts}/${maxAttempts})...`);
      }
    }
    
    // 返回结果
    const totalTime = Date.now() - startTime;
    console.log(`API请求完成 - 总耗时: ${totalTime}ms`);
    
    return NextResponse.json({
      success: true,
      blogger: bloggerInfo,
      roast: roast
    });
    
  } catch (error) {
    console.error("API处理过程中发生未捕获错误:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "处理请求过程中发生未知错误",
      errorDetail: JSON.stringify(error),
      roast: `很抱歉，AI在生成吐槽时遇到了一些技术问题。\n\n【系统消息】\n处理请求时发生错误，请稍后再试。\n\n错误详情: ${error instanceof Error ? error.message : "未知错误"}`
    }, { status: 200 });
  } finally {
    console.log("API请求结束 - ", new Date().toISOString());
  }
}

/**
 * 从HTML中提取博主昵称和头像
 */
function extractBloggerInfo(html: string): { nickname: string; avatar: string } {
  // 结果对象
  const result = {
    nickname: '未知博主',
    avatar: '/default-avatar.svg' // 默认头像，如果提取失败
  };
  
  try {
    // 记录原始HTML的一部分来帮助调试
    console.log('HTML content preview:', html.substring(0, 500));
    
    // 1. 直接从HTML内容中查找标题相关的文本，提高提取的鲁棒性
    // 首先尝试从传统的title标签中提取
    const titleTags = [
      /<title>(.*?)(?:\s*-\s*小红书|<\/title>)/,
      /<h1[^>]*>(.*?)<\/h1>/,
      /<div[^>]*class="[^"]*title[^"]*"[^>]*>(.*?)<\/div>/
    ];
    
    let titleFound = false;
    
    for (const pattern of titleTags) {
      const match = html.match(pattern);
      if (match && match[1] && match[1].trim()) {
        const titleText = match[1].trim();
        console.log('找到标题文本:', titleText);
        
        // 修改：保留括号内容，不再分割
        result.nickname = titleText;
        console.log('从标题提取到博主昵称 (完整昵称):', result.nickname);
        titleFound = true;
        break;
      }
    }
    
    // 如果上面的方法都失败了，尝试在字符串中定位特定的标题模式
    if (!titleFound) {
      // 查找类似 "花叔（只工作不上班版" 这样的模式，直接在HTML文本中
      // 修改正则表达式以捕获括号内容
      const directPattern = /Title:\s*([\u4e00-\u9fa5a-zA-Z0-9]+(?:（[\u4e00-\u9fa5a-zA-Z0-9]+）)?)/;
      const directMatch = html.match(directPattern);
      
      if (directMatch && directMatch[1]) {
        // 不再分割，保留完整名称
        result.nickname = directMatch[1].trim();
        console.log('直接从HTML文本中提取到博主名称:', result.nickname);
        titleFound = true;
      }
    }
    
    // 退化策略：仍然尝试从链接文本提取博主昵称
    if (!titleFound && result.nickname === '未知博主') {
      const userLinkPattern = />([\u4e00-\u9fa5a-zA-Z0-9（）\(\)（）［］\[\]【】\{\}「」""''！!？\?～~、。，,]+?)(?:<\/a>|<\/span>)/g;
      const userLinks = Array.from(html.matchAll(userLinkPattern));
      
      for (const match of userLinks) {
        if (match[1] && match[1].length > 1) {
          if (match[1].includes('（') || match[1].includes('(')) {
            const nameBeforeParenthesis = match[1].split(/[（(]/)[0].trim();
            if (nameBeforeParenthesis) {
              result.nickname = nameBeforeParenthesis;
              console.log('从链接文本提取到博主昵称 (括号前部分):', result.nickname);
              break;
            }
          } else if (result.nickname === '未知博主') {
            result.nickname = match[1].trim();
            console.log('从链接文本提取到博主昵称 (普通链接文本):', result.nickname);
          }
        }
      }
    }
    
    // 最终紧急方案：如果HTML含有"花叔"这样的文本，直接提取
    if (result.nickname === '未知博主') {
      const emergencyMatch = html.match(/(花叔|[\u4e00-\u9fa5]{2,4}叔)/);
      if (emergencyMatch && emergencyMatch[1]) {
        result.nickname = emergencyMatch[1];
        console.log('从紧急模式提取到博主昵称:', result.nickname);
      }
    }
    
    // 2. 提取头像URL
    // 匹配所有可能的头像URL模式
    const avatarPatterns = [
      /https:\/\/sns-avatar-qc\.xhscdn\.com\/avatar\/[a-zA-Z0-9]+\.[a-z]+/,
      /https:\/\/sns-avatar-qc\.xhscdn\.com\/avatar\/[a-zA-Z0-9]+/,
      /https:\/\/sns-avatar[^"']+/
    ];
    
    for (const pattern of avatarPatterns) {
      const match = html.match(pattern);
      if (match && match[0]) {
        result.avatar = match[0];
        console.log('找到头像URL:', result.avatar);
        break;
      }
    }
    
  } catch (error) {
    console.error('提取博主信息时出错:', error);
  }
  
  return result;
}

// 确保支持 OPTIONS 请求以解决 CORS 问题
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
} 