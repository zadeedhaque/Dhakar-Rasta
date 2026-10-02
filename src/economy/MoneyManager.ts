/** In-game currency (৳). Tracks balance plus lifetime earned/spent for the run summary. */
export class MoneyManager {
  balance = 0;
  earned = 0;
  spent = 0;
  bribeSpent = 0;

  reset(): void {
    this.balance = this.earned = this.spent = this.bribeSpent = 0;
  }

  earn(amount: number): void {
    this.balance += amount;
    this.earned += amount;
  }

  canAfford(amount: number): boolean {
    return this.balance >= amount;
  }

  /** Returns false and changes nothing when funds are insufficient. */
  spend(amount: number, isBribe = false): boolean {
    if (!this.canAfford(amount)) return false;
    this.balance -= amount;
    this.spent += amount;
    if (isBribe) this.bribeSpent += amount;
    return true;
  }

  /** Minor-collision penalty: takes what it can, never goes negative. */
  penalise(amount: number): number {
    const taken = Math.min(this.balance, amount);
    this.balance -= taken;
    this.spent += taken;
    return taken;
  }
}
