import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Auth API
export const authAPI = {
  async signup(email: string, password: string, username: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    });
    return { data, error };
  },

  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  async logout() {
    return await supabase.auth.signOut();
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    return { data, error };
  },
};

// Creator API
export const creatorAPI = {
  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from('creator_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    return { data, error };
  },

  async updateProfile(userId: string, updates: any) {
    const { data, error } = await supabase
      .from('creator_profiles')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();
    return { data, error };
  },

  async getEarnings(creatorId: string) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('creator_id', creatorId)
      .eq('status', 'completed');
    
    const total = data?.reduce((sum, t) => sum + parseFloat(t.creator_amount), 0) || 0;
    return { data, total, error };
  },

  async getLeaderboard(limit = 10) {
    const { data, error } = await supabase
      .from('creator_profiles')
      .select('*')
      .order('total_earnings', { ascending: false })
      .limit(limit);
    return { data, error };
  },
};

// Worlds API
export const worldsAPI = {
  async create(creatorId: string, world: any) {
    const { data, error } = await supabase
      .from('worlds')
      .insert([{ creator_id: creatorId, ...world }])
      .select()
      .single();
    return { data, error };
  },

  async get(worldId: string) {
    const { data, error } = await supabase
      .from('worlds')
      .select('*')
      .eq('id', worldId)
      .single();
    return { data, error };
  },

  async list(filters?: any) {
    let query = supabase.from('worlds').select('*');
    
    if (filters?.creatorId) {
      query = query.eq('creator_id', filters.creatorId);
    }
    if (filters?.published) {
      query = query.eq('published', true);
    }
    if (filters?.category) {
      query = query.eq('category', filters.category);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    return { data, error };
  },

  async update(worldId: string, updates: any) {
    const { data, error } = await supabase
      .from('worlds')
      .update(updates)
      .eq('id', worldId)
      .select()
      .single();
    return { data, error };
  },

  async publish(worldId: string) {
    const { data, error } = await supabase
      .from('worlds')
      .update({ published: true, published_at: new Date() })
      .eq('id', worldId)
      .select()
      .single();
    return { data, error };
  },

  async delete(worldId: string) {
    const { error } = await supabase
      .from('worlds')
      .update({ deleted_at: new Date() })
      .eq('id', worldId);
    return { error };
  },
};

// Analytics API
export const analyticsAPI = {
  async trackEvent(eventType: string, data: any) {
    const { error } = await supabase
      .from('analytics_events')
      .insert([{ event_type: eventType, data }]);
    return { error };
  },

  async trackWorldVisit(worldId: string, userId: string) {
    await analyticsAPI.trackEvent('world_visit', { world_id: worldId, user_id: userId });
    
    // Increment visit counter
    const { data: world } = await worldsAPI.get(worldId);
    if (world) {
      await worldsAPI.update(worldId, { visits: (world.visits || 0) + 1 });
    }
  },

  async trackPurchase(worldId: string, userId: string, price: number) {
    await analyticsAPI.trackEvent('world_purchase', { 
      world_id: worldId, 
      user_id: userId,
      price 
    });
  },
};

// Transactions API
export const transactionsAPI = {
  async create(transaction: any) {
    const { data, error } = await supabase
      .from('transactions')
      .insert([transaction])
      .select()
      .single();
    return { data, error };
  },

  async markCompleted(transactionId: string, stripeId: string) {
    const { data, error } = await supabase
      .from('transactions')
      .update({ 
        status: 'completed', 
        completed_at: new Date(),
        stripe_transaction_id: stripeId 
      })
      .eq('id', transactionId)
      .select()
      .single();
    return { data, error };
  },

  async getCreatorStats(creatorId: string) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('creator_id', creatorId)
      .eq('status', 'completed');
    
    const stats = {
      totalEarnings: data?.reduce((sum, t) => sum + parseFloat(t.creator_amount), 0) || 0,
      totalSales: data?.length || 0,
      avgSalePrice: 0,
    };
    
    if (stats.totalSales > 0) {
      stats.avgSalePrice = stats.totalEarnings / stats.totalSales;
    }
    
    return { stats, error };
  },
};

// Reviews API
export const reviewsAPI = {
  async create(worldId: string, userId: string, rating: number, text?: string) {
    const { data, error } = await supabase
      .from('reviews')
      .insert([{ world_id: worldId, reviewer_id: userId, rating, text }])
      .select()
      .single();
    return { data, error };
  },

  async getWorldReviews(worldId: string) {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('world_id', worldId)
      .order('created_at', { ascending: false });
    return { data, error };
  },
};

// Follows API
export const followsAPI = {
  async follow(followerId: string, creatorId: string) {
    const { error } = await supabase
      .from('follows')
      .insert([{ follower_id: followerId, creator_id: creatorId }]);
    return { error };
  },

  async unfollow(followerId: string, creatorId: string) {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('creator_id', creatorId);
    return { error };
  },

  async getFollowers(creatorId: string) {
    const { data, error } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('creator_id', creatorId);
    return { data, error };
  },
};
