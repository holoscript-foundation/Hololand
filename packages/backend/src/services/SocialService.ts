// Social features service (follow, review, rating)
import { getDatabaseService } from '../lib/DatabaseService';
import { getEmailService } from './EmailService';

export class SocialService {
  private static instance: SocialService | null = null;

  static getInstance(): SocialService {
    if (!SocialService.instance) {
      SocialService.instance = new SocialService();
    }
    return SocialService.instance;
  }

  async followCreator(userId: string, creatorId: string): Promise<void> {
    const db = getDatabaseService();

    // Check if already following
    const { data: existing } = await db.supabase
      .from('follows')
      .select('id')
      .eq('follower_id', userId)
      .eq('creator_id', creatorId)
      .single();

    if (existing) {
      throw new Error('Already following this creator');
    }

    // Create follow relationship
    await db.supabase.from('follows').insert({
      follower_id: userId,
      creator_id: creatorId,
    });
  }

  async unfollowCreator(userId: string, creatorId: string): Promise<void> {
    const db = getDatabaseService();

    await db.supabase
      .from('follows')
      .delete()
      .eq('follower_id', userId)
      .eq('creator_id', creatorId);
  }

  async getFollowerCount(creatorId: string): Promise<number> {
    const db = getDatabaseService();

    const { data } = await db.supabase
      .from('follows')
      .select('id', { count: 'exact' })
      .eq('creator_id', creatorId);

    return data?.length || 0;
  }

  async getFollowing(userId: string): Promise<any[]> {
    const db = getDatabaseService();

    const { data } = await db.supabase
      .from('follows')
      .select('creator_id, creator_profiles(display_name, avatar_url)')
      .eq('follower_id', userId);

    return data || [];
  }

  async reviewWorld(
    userId: string,
    worldId: string,
    rating: number,
    reviewText: string
  ): Promise<void> {
    const db = getDatabaseService();

    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    // Check if already reviewed
    const { data: existing } = await db.supabase
      .from('reviews')
      .select('id')
      .eq('user_id', userId)
      .eq('world_id', worldId)
      .single();

    if (existing) {
      // Update existing review
      await db.supabase
        .from('reviews')
        .update({ rating, review_text: reviewText })
        .eq('user_id', userId)
        .eq('world_id', worldId);
    } else {
      // Create new review
      const { data: world } = await db.supabase
        .from('worlds')
        .select('creator_id')
        .eq('id', worldId)
        .single();

      if (!world) {
        throw new Error('World not found');
      }

      await db.supabase.from('reviews').insert({
        user_id: userId,
        world_id: worldId,
        creator_id: world.creator_id,
        rating,
        review_text: reviewText,
      });

      // Send notification email to creator
      const { data: creator } = await db.supabase
        .from('users')
        .select('email, id')
        .eq('id', world.creator_id)
        .single();

      const { data: reviewer } = await db.supabase
        .from('users')
        .select('email')
        .eq('id', userId)
        .single();

      const { data: worldData } = await db.supabase
        .from('worlds')
        .select('title')
        .eq('id', worldId)
        .single();

      if (creator && reviewer && worldData) {
        const emailService = getEmailService();
        await emailService.sendEmail({
          to: creator.email,
          template: 'world-review',
          data: {
            reviewerName: reviewer.email,
            worldTitle: worldData.title,
            rating,
            reviewText,
            worldUrl: `https://hololand.io/worlds/${worldId}`,
          },
        });
      }
    }
  }

  async getWorldReviews(worldId: string, limit: number = 10) {
    const db = getDatabaseService();

    const { data } = await db.supabase
      .from('reviews')
      .select('id, rating, review_text, user_id, created_at, users(email)')
      .eq('world_id', worldId)
      .order('created_at', { ascending: false })
      .limit(limit);

    return data || [];
  }

  async getWorldAverageRating(worldId: string): Promise<number> {
    const db = getDatabaseService();

    const { data } = await db.supabase
      .from('reviews')
      .select('rating')
      .eq('world_id', worldId);

    if (!data || data.length === 0) return 0;

    const sum = data.reduce((acc, r) => acc + (r.rating || 0), 0);
    return sum / data.length;
  }

  async getDiscoveryFeed(userId: string, limit: number = 20) {
    const db = getDatabaseService();

    // Get worlds from creators user follows + trending worlds
    const { data: following } = await db.supabase
      .from('follows')
      .select('creator_id')
      .eq('follower_id', userId);

    const creatorIds = following?.map((f) => f.creator_id) || [];

    const { data: worldsFromFollowing } = await db.supabase
      .from('worlds')
      .select('id, title, description, creator_id, visit_count, published')
      .in('creator_id', creatorIds)
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(limit / 2);

    const { data: trendingWorlds } = await db.supabase
      .from('worlds')
      .select('id, title, description, creator_id, visit_count, published')
      .eq('published', true)
      .order('visit_count', { ascending: false })
      .limit(limit / 2);

    return [...(worldsFromFollowing || []), ...(trendingWorlds || [])];
  }
}

export function getSocialService(): SocialService {
  return SocialService.getInstance();
}
