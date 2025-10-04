// --- SoldierUI.ts ---
import { BackgroundHighlight } from "../BackgroundHighlight";
import LoadingBar from "../LoadingBar";

export class SoldierUI {
  private hpBar: LoadingBar;
  private highlight: BackgroundHighlight;
  private debugText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, soldier: Phaser.GameObjects.Sprite, color: Phaser.Math.Vector3, id: string) {
    this.hpBar = new LoadingBar(scene, soldier);
    this.highlight = new BackgroundHighlight(scene, soldier, color);

    this.debugText = scene.add.text(
      soldier.x, soldier.y + 40,
      `${id.substr(0, 15)}\nhealth:${this.hpBar.getValue()}`,
      { font: "12px Arial", color: "yellow" }
    );
    this.debugText.setOrigin(0.5).setDepth(10);
  }

  updatePosition(soldier: Phaser.GameObjects.Sprite) {
    this.debugText.setPosition(soldier.x, soldier.y + 40);
  }

  updateText(state: string, health: number) {
    this.debugText.setText(`${state}\nhealth:${health}`);
  }

  draw() {
    this.hpBar.draw();
    this.highlight.draw();
  }

  destroy() {
    this.hpBar.destroy();
    this.highlight.destroy();
    this.debugText.destroy();
  }
}
