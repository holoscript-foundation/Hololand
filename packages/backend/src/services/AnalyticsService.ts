// Analytics event tracking service
import { getDatabaseService } from '../lib/DatabaseService';

export interface AnalyticsEvent {
  event_type:
    | 'world_view'
    | 'world_visit'
    | 'purchase'
    | 'review'
    | 'follow'
    | 'world_created'
    | 'world_published'
    | 'world_deleted';
  user_id: string;
  world_id?: string;
  creator_id?: string;
  metadata?: Record<string, any>;
}

export class AnalyticsService {
  private static instance: AnalyticsService | null = null;

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  async trackEvent(event: AnalyticsEvent): Promise<void> {
    const db = getDatabaseService();

    try {
      await db.supabase.from('analytics_events').insert({
        event_type: event.event_type,
        user_id: event.user_id,
        world_id: event.world_id,
        creator_id: event.creator_id,
        metadata: event.metadata,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to track analytics event:', error);
    }
  }

  async getWorldAnalytics(worldId: string) {
    const db = getDatabaseService();

    const [visits, purchases, reviews] = await Promise.all([
      db.supabase
        .from('analytics_events')
        .select('*')
        .eq('world_id', worldId)
        .eq('event_type', 'world_visit')
        .then(({ data }) => data?.length || 0),

      db.supabase
        .from('analytics_events')
        .select('metadata')
        .eq('world_id', worldId)
        .eq('event_type', 'purchase')
        .then(({ data }) => {
          if (!data) return 0;
          return data.reduce((sum, e) => sum + ((e.metadata?.amount as number) || 0), 0);
        }),

      db.supabase
        .from('analytics_events')
        .select('*')
        .eq('world_id', worldId)
        .eq('event_type', 'review')
        .then(({ data }) => data?.length || 0),
    ]);

    return {
      world_id: worldId,
      visits,
      revenue: purchases,
      review_count: reviews,
    };
  }

  async getCreatorAnalytics(creatorId: string, days: number = 30) {
    const db = getDatabaseService();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: events } = await db.supabase
      .from('analytics_events')
      .select('event_type, metadata, world_id')
      .eq('creator_id', creatorId)
      .gte('created_at', startDate.toISOString());

    if (!events) {
      return { total_visits: 0, total_revenue: 0, worlds_created: 0, worlds_published: 0 };
    }

    const stats = {
      total_visits: 0,
      total_revenue: 0,
      worlds_created: 0,
      worlds_published: 0,
      total_reviews: 0,
    };

    for (const event of events) {
      switch (event.event_type) {
        case 'world_visit':
          stats.total_visits++;
          break;
        case 'purchase':
          stats.total_revenue += (event.metadata?.amount as number) || 0;
          break;
        case 'world_created':
          stats.worlds_created++;
          break;
        case 'world_published':
          stats.worlds_published++;
          break;
        case 'review':
          stats.total_reviews++;
          break;
      }
    }

    return stats;
  }

  async getTopWorlds(limit: number = 10) {
    const db = getDatabaseService();

    // Get worlds ranked by visits
    const { data: events } = await db.supabase
      .from('analytics_events')
      .select('world_id')
      .eq('event_type', 'world_visit')
      .limit(10000);

    if (!events || events.length === 0) {
      return [];
    }

    const worldCounts: Record<string, number> = {};
    for (const event of events) {
      if (event.world_id) {
        worldCounts[event.world_id] = (worldCounts[event.world_id] || 0) + 1;
      }
    }

    const topWorldIds = Object.entries(worldCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([id]) => id);

    const { data: worlds } = await db.supabase
      .from('worlds')
      .select('id, title, creator_id, visit_count')
      .in('id', topWorldIds);

    return worlds || [];
  }

  async getTrendingWorlds(days: number = 7, limit: number = 10) {
    const db = getDatabaseService();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: events } = await db.supabase
      .from('analytics_events')
      .select('world_id')
      .eq('event_type', 'world_visit')
      .gte('created_at', startDate.toISOString())
      .limit(10000);

    if (!events || events.length === 0) {
      return [];
    }

    const worldCounts: Record<string, number> = {};
    for (const event of events) {
      if (event.world_id) {
        worldCounts[event.world_id] = (worldCounts[event.world_id] || 0) + 1;
      }
    }

    const trendingWorldIds = Object.entries(worldCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([id]) => id);

    const { data: worlds } = await db.supabase
      .from('worlds')
      .select('id, title, creator_id')
      .in('id', trendingWorldIds);

    return worlds || [];
  }
}

export function getAnalyticsService(): AnalyticsService {
  return AnalyticsService.getInstance();
}
