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
async function generateRoast(content: string): Promise<string> {
  try {
    // DeepSeek API配置
    const apiKey = process.env.DEEPSEEK_API_KEY;
    
    if (!apiKey) {
      throw new Error('DeepSeek API密钥未配置');
    }
    
    console.log('调用DeepSeek API，内容长度:', content.length);
    console.log('API密钥前几位:', apiKey.substring(0, 5) + '...');
    
    // 准备请求体 - 尝试使用 deepseek-reasoner 模型
    const requestBody = {
      model: 'deepseek-reasoner',
      messages: [
        {
          role: 'user',
          content: `请用500字roast这名小红书博主:\n\n${content}`
        }
      ],
      temperature: 0.7,
      max_tokens: 4000
    };
    
    console.log('DeepSeek API请求体:', JSON.stringify(requestBody, null, 2).substring(0, 300) + '...');
    
    // 发送请求到DeepSeek API
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('DeepSeek API响应状态:', response.status, response.statusText);
    
    // 读取响应内容（只读取一次）
    const responseText = await response.text();
    
    if (!response.ok) {
      console.error('DeepSeek API响应错误 (原始文本):', responseText);
      
      // 尝试将错误解析为JSON，失败则使用原始文本
      let errorMessage = '未知错误';
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.error?.message || 
                      errorData.message || 
                      JSON.stringify(errorData);
      } catch {
        errorMessage = responseText || '未知错误';
      }
      
      throw new Error(`DeepSeek API错误: ${errorMessage}`);
    }
    
    // 处理成功响应
    console.log('DeepSeek API响应原始文本 (前100字符):', responseText.substring(0, 100) + '...');
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error('解析响应JSON失败');
      throw new Error('无法解析API响应数据');
    }
    
    console.log('DeepSeek API响应数据结构:', Object.keys(data));
    
    // 确保返回的数据符合预期格式
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('DeepSeek API返回的数据格式不符合预期:', data);
      throw new Error('API返回的数据格式不正确');
    }
    
    console.log('成功获取到吐槽结果');
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error calling DeepSeek API:', error);
    throw new Error('生成吐槽失败，请稍后再试');
  }
}

export async function POST(request: NextRequest) {
  try {
    // 检查环境变量是否正确加载
    console.log('环境变量检查 - DEEPSEEK_API_KEY是否存在:', !!process.env.DEEPSEEK_API_KEY);
    if (process.env.DEEPSEEK_API_KEY) {
      console.log('环境变量 - DEEPSEEK_API_KEY前5位:', process.env.DEEPSEEK_API_KEY.substring(0, 5) + '...');
    }
    
    const body = await request.json();
    const { url } = body;
    
    if (!url || !url.includes('xiaohongshu.com')) {
      return NextResponse.json(
        { error: '请提供有效的小红书链接' }, 
        { status: 400 }
      );
    }
    
    try {
      // 1. 使用r.jina.ai爬取小红书内容
      let content;
      let bloggerInfo = {
        nickname: '未知博主',
        avatar: '/default-avatar.svg' // 默认头像，如果提取失败
      };
      
      try {
        // 直接获取原始HTML内容，不做额外提取加工
        content = await fetchRawXiaohongshuContent(url);
        console.log('成功获取原始HTML内容，长度:', content.length);
        
        // 提取博主昵称和头像
        bloggerInfo = extractBloggerInfo(content);
        console.log('提取的博主信息:', bloggerInfo);
        
      } catch (contentError) {
        console.error('内容提取失败，使用备用内容:', contentError);
        // 如果内容提取失败，使用备用内容，仍然可以进行吐槽
        const urlParts = url.split('/');
        const possibleUserId = urlParts[urlParts.length - 1];
        content = `用户名: 神秘小红书用户 (ID可能是: ${possibleUserId})\n简介: 这位博主非常神秘，连爬虫都无法窥探其内容的奥秘。\n\n未找到笔记，但我仍能根据有限信息进行创意吐槽`;
      }
      
      // 2. 调用DeepSeek API生成吐槽
      const roast = await generateRoast(content);
      
      // Format the roast content before returning
      const formattedRoast = roast
        .trim()
        // Ensure separate paragraphs have double line breaks
        .replace(/\n{3,}/g, '\n\n')
        // Ensure single line breaks are preserved
        .replace(/\n/g, '\n');
      
      // Return complete JSON response
      return NextResponse.json({ 
        roast: formattedRoast, 
        blogger: bloggerInfo 
      });
      
    } catch (error) {
      console.error('处理请求时发生错误:', error);
      const errorMessage = error instanceof Error ? error.message : '处理请求时发生错误';
      return NextResponse.json(
        { error: errorMessage }, 
        { status: 500 }
      );
    }
    
  } catch (error: unknown) {
    console.error('API error:', error);
    const errorMessage = error instanceof Error ? error.message : '处理请求时发生错误';
    return NextResponse.json(
      { error: errorMessage }, 
      { status: 500 }
    );
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