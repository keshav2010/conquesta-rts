
import { GameScene } from "../scenes/GameScene";
export interface IPointerStrategy {
  name : string;
  pointerdown(scene: GameScene, pointer: Phaser.Input.Pointer): void;
  pointerup(scene: GameScene, pointer: Phaser.Input.Pointer): void;
  pointermove(scene: GameScene, pointer: Phaser.Input.Pointer): void;
  pointerout(scene: GameScene, pointer: Phaser.Input.Pointer): void;
}
