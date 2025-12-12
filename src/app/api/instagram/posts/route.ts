import { NextResponse } from 'next/server';
import { getInstagramPosts, convertToCarouselFormat } from '@/lib/instagram';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '10');
  const format = searchParams.get('format') || 'raw';

  try {
    const posts = await getInstagramPosts(Math.min(limit, 50));

    if (format === 'carousel') {
      return NextResponse.json({
        success: true,
        data: convertToCarouselFormat(posts),
      });
    }

    return NextResponse.json({
      success: true,
      data: posts,
    });
  } catch (error) {
    console.error('Erro na API do Instagram:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar posts do Instagram' },
      { status: 500 }
    );
  }
}

