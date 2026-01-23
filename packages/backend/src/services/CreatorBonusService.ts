// Creator program: first-world bonus and credit system
import { getDatabaseService } from '../lib/DatabaseService';
import { getEmailService } from './EmailService';

const FIRST_WORLD_BONUS = 10000; // $100 in cents

export class CreatorBonusService {
  private static instance: CreatorBonusService | null = null;

  static getInstance(): CreatorBonusService {
    if (!CreatorBonusService.instance) {
      CreatorBonusService.instance = new CreatorBonusService();
    }
    return CreatorBonusService.instance;
  }

  async awardFirstWorldBonus(userId: string, userName: string, email: string): Promise<void> {
    const db = getDatabaseService();

    // Check if creator already received bonus
    const { data: profile } = await db.supabase
      .from('creator_profiles')
      .select('received_first_world_bonus, total_earnings')
      .eq('user_id', userId)
      .single();

    if (profile?.received_first_world_bonus) {
      console.log(`User ${userId} already received first world bonus`);
      return;
    }

    // Award bonus credits
    const { data: updated } = await db.supabase
      .from('creator_profiles')
      .update({
        total_earnings: (profile?.total_earnings || 0) + FIRST_WORLD_BONUS,
        received_first_world_bonus: true,
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (updated) {
      // Send email notification
      const emailService = getEmailService();
      await emailService.sendEmail({
        to: email,
        template: 'welcome',
        data: {
          userName,
          dashboardUrl: 'https://hololand.io/dashboard',
          helpUrl: 'https://hololand.io/help/creator-guide',
        },
      });

      console.log(`First world bonus awarded to user ${userId}`);
    }
  }

  async getCreatorBalance(userId: string): Promise<number> {
    const db = getDatabaseService();

    const { data } = await db.supabase
      .from('creator_profiles')
      .select('total_earnings')
      .eq('user_id', userId)
      .single();

    return data?.total_earnings || 0;
  }

  async createTransaction(
    buyerId: string,
    creatorId: string,
    worldId: string,
    amount: number
  ): Promise<string> {
    const db = getDatabaseService();

    // Check creator balance (for purchases using credits)
    const { data: transaction } = await db.supabase
      .from('transactions')
      .insert({
        buyer_id: buyerId,
        creator_id: creatorId,
        world_id: worldId,
        total_amount: amount,
        creator_amount: Math.floor(amount * 0.7),
        platform_amount: Math.floor(amount * 0.3),
        status: 'pending',
      })
      .select()
      .single();

    if (transaction) {
      return transaction.id;
    }

    throw new Error('Failed to create transaction');
  }

  async getCreatorLeaderboard(limit: number = 10) {
    const db = getDatabaseService();

    const { data } = await db.supabase
      .from('creator_profiles')
      .select('user_id, display_name, total_earnings, users(email)')
      .order('total_earnings', { ascending: false })
      .limit(limit);

    return data || [];
  }

  async getTopEarners(days: number = 30, limit: number = 10) {
    const db = getDatabaseService();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: transactions } = await db.supabase
      .from('transactions')
      .select('creator_id, creator_amount')
      .eq('status', 'completed')
      .gte('created_at', startDate.toISOString());

    if (!transactions || transactions.length === 0) {
      return [];
    }

    // Calculate earnings per creator
    const earnings: Record<string, number> = {};
    for (const tx of transactions) {
      if (tx.creator_id) {
        earnings[tx.creator_id] = (earnings[tx.creator_id] || 0) + (tx.creator_amount || 0);
      }
    }

    // Sort and get top earners
    const topCreatorIds = Object.entries(earnings)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([id]) => id);

    const { data: creators } = await db.supabase
      .from('creator_profiles')
      .select('user_id, display_name, total_earnings')
      .in('user_id', topCreatorIds);

    return creators || [];
  }
}

export function getCreatorBonusService(): CreatorBonusService {
  return CreatorBonusService.getInstance();
}
