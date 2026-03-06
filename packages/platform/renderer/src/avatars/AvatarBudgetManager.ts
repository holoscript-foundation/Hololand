/**
 * @hololand/renderer AvatarBudgetManager
 *
 * Manages total avatar rendering budget across all visible avatars.
 */

import { CompressedGaussianAvatar } from './CompressedGaussianAvatar';

export class AvatarBudgetManager {
  private budget: number;
  private avatars: Map<string, CompressedGaussianAvatar> = new Map();

  constructor(budgetSplats: number = 500_000) { this.budget = budgetSplats; }

  addAvatar(avatar: CompressedGaussianAvatar): void { this.avatars.set(avatar.avatarId, avatar); }
  removeAvatar(avatarId: string): void { this.avatars.delete(avatarId); }

  getTotalSplats(): number {
    let total = 0;
    for (const avatar of this.avatars.values()) total += avatar.getActiveSplatCount();
    return total;
  }

  isOverBudget(): boolean { return this.getTotalSplats() > this.budget; }
  getAvatarCount(): number { return this.avatars.size; }
  getBudget(): number { return this.budget; }

  /** Reduce LOD levels until within budget */
  enforceBudget(): number {
    let reductions = 0;
    while (this.isOverBudget()) {
      let reduced = false;
      for (const avatar of this.avatars.values()) {
        if (avatar.getCurrentLOD() < 3) {
          avatar.setLOD(avatar.getCurrentLOD() + 1);
          reduced = true;
          reductions++;
          if (!this.isOverBudget()) break;
        }
      }
      if (!reduced) break;
    }
    return reductions;
  }
}
