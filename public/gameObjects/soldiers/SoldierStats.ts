// --- SoldierStats.ts ---
export class SoldierStats {
  private health: number = 100;
  private maxHealth: number = 100;

  constructor(initialHealth: number = 100) {
    this.health = initialHealth;
  }

  setHealth(value: number) {
    this.health = Phaser.Math.Clamp(value, 0, this.maxHealth);
  }

  getHealth() {
    return this.health;
  }

  isDead() {
    return this.health <= 0;
  }
}
