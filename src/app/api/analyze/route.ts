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
  try {
    // DeepSeek API配置
    const apiKey = process.env.DEEPSEEK_API_KEY;
    
    if (!apiKey) {
      throw new Error('DeepSeek API密钥未配置');
    }
    
    console.log('调用DeepSeek API，内容长度:', blogContent.length);
    console.log('API密钥前几位:', apiKey.substring(0, 5) + '...');
    
    // 准备请求体 - 尝试使用 deepseek-reasoner 模型
    const requestBody = {
      model: 'deepseek-reasoner',
      messages: [
        {
          role: 'user',
          content: `用300字roast这名小红书博主:\n\n${blogContent}`
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
    console.log('DeepSeek API响应原始文本 (前100字符):', responseText.substring(0, 100) + '...');
    
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
    } catch (parseError) {
      console.error('解析响应JSON失败, 错误:', parseError);
      console.error('原始响应内容:', responseText);
      
      // 尝试处理潜在的格式问题 - 提取 JSON 部分
      const jsonMatch = responseText.match(/\{.*\}/s);
      if (jsonMatch) {
        try {
          data = JSON.parse(jsonMatch[0]);
          console.log('成功从部分文本中提取JSON');
        } catch (extractError) {
          console.error('从响应中提取JSON失败:', extractError);
          
          // 最后的备用方案：如果无法解析，返回一个默认的吐槽
          return `很抱歉，AI在生成吐槽时遇到了一些问题。

【关于这位博主】
这位小红书博主看起来很有趣，但AI在解析数据时遇到了技术问题。

【吐槽】
即使是AI也有卡壳的时候，就像人类写作时遇到的灵感枯竭。不过，如果您再试一次，也许会有惊喜。毕竟，失败是成功之母，重试是程序员的必备技能！

希望下次能为您提供一个更有趣的吐槽！`;
        }
      } else {
        // 如果找不到任何JSON格式的内容，返回默认吐槽
        return `很抱歉，AI在生成吐槽时遇到了一些问题。

【关于这位博主】
这位小红书博主看起来很有趣，但AI在解析数据时遇到了技术问题。

【吐槽】
即使是AI也有卡壳的时候，就像人类写作时遇到的灵感枯竭。不过，如果您再试一次，也许会有惊喜。毕竟，失败是成功之母，重试是程序员的必备技能！

希望下次能为您提供一个更有趣的吐槽！`;
      }
    }
    
    // 确保数据存在
    if (!data) {
      console.error('DeepSeek API返回的数据为空');
      throw new Error('API返回的数据为空');
    }
    
    console.log('DeepSeek API响应数据结构:', Object.keys(data));
    
    // 确保返回的数据符合预期格式，添加更强大的错误处理
    if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
      console.error('DeepSeek API返回的数据格式不符合预期 (无choices数组):', data);
      throw new Error('API返回的数据格式不正确 (无choices数组)');
    }
    
    const choice = data.choices[0];
    if (!choice || !choice.message || !choice.message.content) {
      console.error('DeepSeek API返回的choice格式不符合预期:', choice);
      throw new Error('API返回的数据格式不正确 (无消息内容)');
    }
    
    const content = choice.message.content;
    if (typeof content !== 'string' || content.trim() === '') {
      console.error('DeepSeek API返回的内容为空或非字符串:', content);
      throw new Error('API返回的内容为空或非字符串');
    }
    
    console.log('成功获取到吐槽结果');
    return content;
  } catch (error) {
    console.error('Error calling DeepSeek API:', error);
    // 更友好的错误信息，并提供备用内容
    return `很抱歉，AI在生成吐槽时遇到了一些问题。

【关于这位博主】
这位小红书博主看起来很有趣，但AI在处理时遇到了一些挑战。

【吐槽】
AI也有出错的时候，就像那些经常"翻车"的网红博主一样。不过，与其沮丧，不如再试一次！毕竟，在互联网的世界里，重新加载页面解决90%的问题。

希望下次能为您提供一个精彩的吐槽！`;
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
      
      // 2. 调用DeepSeek API生成吐槽 - 现在不会抛出错误，而是返回备用内容
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
      
      // 即使出错，也返回一个可用的结果，而不是错误
      const defaultRoast = `很抱歉，AI在生成吐槽时遇到了一些问题。

【技术小插曲】
看起来我们遇到了一些技术问题，可能是因为：
1. 服务器太忙了，就像小红书热门博主的评论区一样拥挤
2. 这位博主太特别了，连AI都一时语塞
3. 网络连接不稳定，像极了蹭网时的WiFi信号

请稍后再试，下次一定会更好！`;

      // 仍然返回200状态码，但带有备用内容
      return NextResponse.json({ 
        roast: defaultRoast,
        blogger: {
          nickname: url.split('/').pop() || '未知博主',
          avatar: '/default-avatar.svg'
        },
        isError: true
      });
    }
    
  } catch (error: unknown) {
    console.error('API error:', error);
    const errorMessage = error instanceof Error ? error.message : '处理请求时发生错误';
    
    // 始终返回一个有效的响应，即使是最外层的错误处理
    return NextResponse.json({
      roast: `看起来出了点问题，但别担心！\n\n就像小红书博主的"真实生活"vs镜头前的样子一样，有时候技术也会有落差。请稍后再试！`,
      blogger: {
        nickname: '系统错误',
        avatar: '/default-avatar.svg'
      },
      isError: true
    });
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