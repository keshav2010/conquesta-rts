import Phaser from "phaser";
export class BloodStain extends Phaser.GameObjects.Graphics {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene);

    // Deep red color with slight variation
    const color = Phaser.Display.Color.GetColor(
      Phaser.Math.Between(120, 160), // R
      Phaser.Math.Between(0, 20),    // G
      Phaser.Math.Between(0, 20)     // B
    );

    // === MAIN IRREGULAR SPLATTER (jagged polygon) ===
    const points: Phaser.Math.Vector2[] = [];
    const radius = Phaser.Math.Between(20, 35);
    const jaggedness = 0.4;

    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const r = radius + Phaser.Math.Between(-radius * jaggedness, radius * jaggedness);
      points.push(new Phaser.Math.Vector2(x + Math.cos(angle) * r, y + Math.sin(angle) * r));
    }

    this.fillStyle(color, 0.85);
    this.beginPath();
    this.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.lineTo(points[i].x, points[i].y);
    }
    this.closePath();
    this.fillPath();

    // === DROPLETS AROUND SPLATTER ===
    for (let i = 0; i < Phaser.Math.Between(5, 10); i++) {
      const dropRadius = Phaser.Math.Between(3, 6);
      const offsetX = Phaser.Math.Between(-50, 50);
      const offsetY = Phaser.Math.Between(-50, 50);
      this.fillStyle(color, Phaser.Math.FloatBetween(0.5, 0.9));
      this.fillCircle(x + offsetX, y + offsetY, dropRadius);
    }

    // === STREAKS SHOOTING OUTWARD ===
    this.lineStyle(2, color, 0.7);
    for (let i = 0; i < Phaser.Math.Between(4, 8); i++) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const length = Phaser.Math.Between(30, 70);

      const endX = x + Math.cos(angle) * length;
      const endY = y + Math.sin(angle) * length;

      this.beginPath();
      this.moveTo(x, y);
      this.lineTo(endX, endY);
      this.strokePath();
    }

    // Add it to the scene, below other objects
    this.setDepth(0);
    scene.add.existing(this);

    // === OPTIONAL FADE OUT ===
    scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 15000, // 15 seconds
      ease: "Linear",
      onComplete: () => this.destroy(),
    });
  }
}
