// Instagram API Integration
// Documentação: https://developers.facebook.com/docs/instagram-basic-display-api

const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;

export interface InstagramPost {
  id: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url: string;
  thumbnail_url?: string;
  permalink: string;
  caption?: string;
  timestamp: string;
}

export interface InstagramMedia {
  src: string;
  alt: string;
  caption: string;
  permalink: string;
}

/**
 * Busca posts do Instagram do usuário autenticado
 * @param limit Número de posts a buscar (máximo 100)
 */
export async function getInstagramPosts(limit: number = 10): Promise<InstagramPost[]> {
  if (!INSTAGRAM_ACCESS_TOKEN) {
    console.warn('INSTAGRAM_ACCESS_TOKEN não configurado');
    return [];
  }

  try {
    const response = await fetch(
      `https://graph.instagram.com/me/media?fields=id,media_type,media_url,thumbnail_url,permalink,caption,timestamp&access_token=${INSTAGRAM_ACCESS_TOKEN}&limit=${limit}`,
      { next: { revalidate: 3600 } } // Cache por 1 hora
    );

    if (!response.ok) {
      throw new Error(`Instagram API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Erro ao buscar posts do Instagram:', error);
    return [];
  }
}

/**
 * Busca posts de um usuário específico pelo username
 * Nota: Requer Instagram Graph API (para contas business/creator)
 */
export async function getInstagramPostsByUsername(
  username: string,
  limit: number = 10
): Promise<InstagramPost[]> {
  // A API básica não permite buscar por username
  // Para isso, seria necessário a Graph API com conta business
  // Por enquanto, retorna os posts do usuário autenticado
  return getInstagramPosts(limit);
}

/**
 * Converte posts do Instagram para o formato do carrossel
 */
export function convertToCarouselFormat(posts: InstagramPost[]): InstagramMedia[] {
  return posts
    .filter(post => post.media_type === 'IMAGE' || post.media_type === 'CAROUSEL_ALBUM')
    .map(post => ({
      src: post.media_url,
      alt: post.caption?.slice(0, 100) || 'Post do Instagram',
      caption: post.caption?.slice(0, 150) || '',
      permalink: post.permalink,
    }));
}

/**
 * Refresh do token de acesso (tokens expiram em 60 dias)
 * Deve ser chamado periodicamente via cron job
 */
export async function refreshInstagramToken(): Promise<string | null> {
  if (!INSTAGRAM_ACCESS_TOKEN) {
    return null;
  }

  try {
    const response = await fetch(
      `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${INSTAGRAM_ACCESS_TOKEN}`
    );

    if (!response.ok) {
      throw new Error(`Token refresh error: ${response.status}`);
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Erro ao renovar token do Instagram:', error);
    return null;
  }
}

