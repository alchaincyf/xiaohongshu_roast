import { NextResponse } from 'next/server';

// 简单测试API用于验证环境变量和DeepSeek API连接
export async function GET() {
  try {
    // 检查环境变量
    const apiKey = process.env.DEEPSEEK_API_KEY;
    const hasApiKey = !!apiKey;
    const apiKeyPrefix = apiKey ? apiKey.substring(0, 5) + '...' : 'undefined';
    
    // 测试DeepSeek API连接
    let apiTestResult = 'API测试未执行';
    let apiResponseStatus = 'N/A';
    
    if (hasApiKey) {
      try {
        const testBody = {
          model: 'deepseek-reasoner',
          messages: [
            { role: 'user', content: '你好，这是一个测试.' }
          ],
          max_tokens: 20
        };
        
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify(testBody)
        });
        
        apiResponseStatus = `${response.status} ${response.statusText}`;
        
        if (response.ok) {
          const data = await response.json();
          apiTestResult = 'API测试成功: ' + 
                         (data.choices?.[0]?.message?.content?.substring(0, 20) || JSON.stringify(data));
        } else {
          const errorText = await response.text();
          apiTestResult = `API测试失败: ${errorText.substring(0, 100)}...`;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        apiTestResult = `API测试异常: ${errorMessage}`;
      }
    }
    
    // 返回环境信息
    return NextResponse.json({
      env: {
        NODE_ENV: process.env.NODE_ENV,
        hasApiKey,
        apiKeyPrefix
      },
      apiTest: {
        result: apiTestResult,
        responseStatus: apiResponseStatus
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 