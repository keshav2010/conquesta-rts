import Phaser from "phaser";
export class BloodStain extends Phaser.GameObjects.Graphics {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene);

    // Random blood red shades
    const color = Phaser.Display.Color.GetColor(
      Phaser.Math.Between(120, 180), // R
      0,
      0
    );

    // Draw a few random circles for splatter
    for (let i = 0; i < Phaser.Math.Between(3, 7); i++) {
      const radius = Phaser.Math.Between(5, 15);
      const offsetX = Phaser.Math.Between(-15, 15);
      const offsetY = Phaser.Math.Between(-15, 15);

      this.fillStyle(color, 0.8);
      this.fillCircle(x + offsetX, y + offsetY, radius);
    }

    this.setDepth(0); // below units
    scene.add.existing(this);

    // Optional fade-out
    scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 10000,
      ease: "Linear",
      onComplete: () => this.destroy(),
    });
  }
}

