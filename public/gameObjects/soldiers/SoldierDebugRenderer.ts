// --- SoldierDebugRenderer.ts ---
import SAT from "sat";

export class SoldierDebugRenderer {
  private brush: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.brush = scene.add.graphics().setDepth(10);
  }

  render(soldier: Phaser.GameObjects.Sprite, serverPos: SAT.Vector, expectedPos: {x: number, y: number}) {
    this.brush.clear();

    // server circle
    this.brush.lineStyle(1, 0xff00ff, 1);
    this.brush.strokeCircle(serverPos.x + soldier.height / 2, serverPos.y + soldier.height / 2, soldier.height / 2);

    // expected pos marker
    this.brush.fillStyle(0xffffff, 0.3);
    this.brush.fillCircle(expectedPos.x + soldier.width / 2, expectedPos.y + soldier.width / 2, soldier.height / 4);

    // line from current → expected
    this.brush.lineStyle(1, 0xffffff, 0.6);
    this.brush.strokeLineShape(new Phaser.Geom.Line(
      soldier.x + soldier.width / 2, soldier.y + soldier.width / 2,
      expectedPos.x + soldier.width / 2, expectedPos.y + soldier.width / 2
    ));

    // vision radius
    this.brush.lineStyle(2, 0x883322, 0.1);
    this.brush.strokeCircle(soldier.x, soldier.y, 100);
  }

  destroy() {
    this.brush.destroy();
  }
}
