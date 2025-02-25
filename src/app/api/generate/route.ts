// 第二步：生成吐槽
export const runtime = 'edge';
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const html = data.html;
    const bloggerInfo = data.blogger;
    
    // 生成吐槽
    const roast = await generateRoast(html);
    
    // 返回生成的吐槽和博主信息
    return NextResponse.json({
      success: true,
      roast: roast,
      blogger: bloggerInfo
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '生成吐槽失败',
      roast: `看起来出了点问题，但别担心！\n\n就像小红书博主的"真实生活"vs镜头前的样子一样，有时候技术也会有落差。请稍后再试！`,
      blogger: data.blogger
    });
  }
} 