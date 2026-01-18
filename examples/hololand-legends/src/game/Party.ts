/**
 * Party System
 * 
 * Manages the player's creature party (FF-style)
 */

export type CreatureClass = 'tank' | 'dps' | 'healer' | 'support';

export interface Skill {
  id: string;
  name: string;
  mpCost: number;
  power: number;
  element?: string;
}

export interface PartyMember {
  id: string;
  name: string;
  class: CreatureClass;
  level: number;
  exp: number;
  expToNext: number;
  
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  
  atk: number;
  def: number;
  speed: number;
  magic: number;
  luck: number;
  
  skills: string[];
  element?: string;
}

export class Party {
  private members: PartyMember[] = [];
  private maxActive = 4;
  private maxBench = 4;
  
  addMember(member: Partial<PartyMember> & { id: string; name: string }): boolean {
    if (this.members.length >= this.maxActive + this.maxBench) {
      return false; // Party full
    }
    
    const fullMember: PartyMember = {
      id: member.id,
      name: member.name,
      class: member.class ?? 'dps',
      level: member.level ?? 1,
      exp: member.exp ?? 0,
      expToNext: member.expToNext ?? 100,
      hp: member.hp ?? 20,
      maxHp: member.maxHp ?? 20,
      mp: member.mp ?? 10,
      maxMp: member.maxMp ?? 10,
      atk: member.atk ?? 5,
      def: member.def ?? 5,
      speed: member.speed ?? 5,
      magic: member.magic ?? 5,
      luck: member.luck ?? 5,
      skills: member.skills ?? ['tackle'],
      element: member.element,
    };
    
    this.members.push(fullMember);
    return true;
  }
  
  removeMember(id: string): PartyMember | null {
    const index = this.members.findIndex(m => m.id === id);
    if (index === -1) return null;
    
    return this.members.splice(index, 1)[0];
  }
  
  swapPositions(index1: number, index2: number): void {
    if (index1 < 0 || index1 >= this.members.length) return;
    if (index2 < 0 || index2 >= this.members.length) return;
    
    const temp = this.members[index1];
    this.members[index1] = this.members[index2];
    this.members[index2] = temp;
  }
  
  getActiveMembers(): PartyMember[] {
    return this.members.slice(0, this.maxActive);
  }
  
  getBenchMembers(): PartyMember[] {
    return this.members.slice(this.maxActive);
  }
  
  getAllMembers(): PartyMember[] {
    return [...this.members];
  }
  
  getMember(id: string): PartyMember | undefined {
    return this.members.find(m => m.id === id);
  }
  
  healAll(): void {
    for (const member of this.members) {
      member.hp = member.maxHp;
      member.mp = member.maxMp;
    }
  }
  
  addExp(amount: number): string[] {
    const levelUps: string[] = [];
    
    for (const member of this.getActiveMembers()) {
      if (member.hp <= 0) continue; // Dead members don't get EXP
      
      member.exp += amount;
      
      while (member.exp >= member.expToNext) {
        member.exp -= member.expToNext;
        this.levelUp(member);
        levelUps.push(member.name);
      }
    }
    
    return levelUps;
  }
  
  private levelUp(member: PartyMember): void {
    member.level++;
    member.expToNext = Math.floor(member.expToNext * 1.2);
    
    // Stat growth based on class
    const growthRates: Record<CreatureClass, Partial<PartyMember>> = {
      tank: { maxHp: 8, def: 3, atk: 1, speed: 1, magic: 0 },
      dps: { maxHp: 4, atk: 3, speed: 2, def: 1, magic: 1 },
      healer: { maxHp: 3, magic: 3, mp: 3, atk: 1, def: 1 },
      support: { maxHp: 4, speed: 3, luck: 2, atk: 1, def: 1 },
    };
    
    const growth = growthRates[member.class];
    
    member.maxHp += (growth.maxHp ?? 0) + Math.floor(Math.random() * 3);
    member.maxMp += (growth.maxMp ?? 0) + Math.floor(Math.random() * 2);
    member.atk += (growth.atk ?? 0) + Math.floor(Math.random() * 2);
    member.def += (growth.def ?? 0) + Math.floor(Math.random() * 2);
    member.speed += (growth.speed ?? 0) + Math.floor(Math.random() * 2);
    member.magic += (growth.magic ?? 0) + Math.floor(Math.random() * 2);
    member.luck += (growth.luck ?? 0) + Math.floor(Math.random() * 2);
    
    // Full heal on level up
    member.hp = member.maxHp;
    member.mp = member.maxMp;
  }
  
  // Serialization for save/load
  serialize(): string {
    return JSON.stringify(this.members);
  }
  
  deserialize(data: string): void {
    try {
      this.members = JSON.parse(data);
    } catch {
      this.members = [];
    }
  }
}
