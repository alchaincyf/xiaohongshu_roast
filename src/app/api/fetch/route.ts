// 第一步：爬取内容
export const runtime = 'edge';
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const url = data.url;
    
    // 爬取内容
    const html = await fetchRawXiaohongshuContent(url);
    
    // 提取博主信息
    const bloggerInfo = extractBloggerInfo(html);
    
    // 返回爬取的内容和博主信息
    return NextResponse.json({
      success: true,
      html: html,
      blogger: bloggerInfo
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '爬取内容失败'
    });
  }
} 