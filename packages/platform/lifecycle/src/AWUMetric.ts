/**
 * @hololand/lifecycle AWUMetric
 *
 * Active Weekly Users metric for VR worlds.
 */

export class AWUMetric {
  readonly worldId: string;
  private weeklyUsers: Map<string, Set<string>> = new Map(); // weekKey -> userIds

  constructor(worldId: string) { this.worldId = worldId; }

  recordUser(userId: string, timestamp: number = Date.now()): void {
    const weekKey = this.getWeekKey(timestamp);
    if (!this.weeklyUsers.has(weekKey)) this.weeklyUsers.set(weekKey, new Set());
    this.weeklyUsers.get(weekKey)!.add(userId);
  }

  getAWU(timestamp: number = Date.now()): number {
    return this.weeklyUsers.get(this.getWeekKey(timestamp))?.size ?? 0;
  }

  getAWUHistory(weeks: number = 4): Array<{ week: string; users: number }> {
    const result: Array<{ week: string; users: number }> = [];
    const now = Date.now();
    for (let i = 0; i < weeks; i++) {
      const ts = now - i * 7 * 24 * 60 * 60 * 1000;
      const weekKey = this.getWeekKey(ts);
      result.push({ week: weekKey, users: this.weeklyUsers.get(weekKey)?.size ?? 0 });
    }
    return result;
  }

  private getWeekKey(timestamp: number): string {
    const d = new Date(timestamp);
    const year = d.getFullYear();
    const week = Math.ceil((d.getDate() + new Date(year, d.getMonth(), 1).getDay()) / 7);
    return `${year}-W${week}`;
  }
}
