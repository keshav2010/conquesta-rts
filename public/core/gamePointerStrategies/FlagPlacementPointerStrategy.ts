import { injectable, container, inject } from "tsyringe";
import { NetworkManager } from "../../network/NetworkManager";
import { GameScene } from "../../scenes/GameScene";
import { PacketType } from "../../../common/PacketType";
import { IPointerStrategy } from "./pointerStrategy";
import { PointerModeContext } from "./PointerModeContext";
import { DefaultPointerModeStrategy } from "./DefaultPointerModeStrategy";
import { DataKey } from "../../config/DataKey";



@injectable()
export class FlagPlacementPointerModeStrategy implements IPointerStrategy {
  readonly name: string = "flag-policy";
  pointerdown(scene: GameScene, pointer: Phaser.Input.Pointer): void {
    console.log(`[FlagPlacementPointerStrategy] BTN:${pointer.button}(${typeof pointer.button}) pointerdown`)    

    if (pointer.button !== 0) {
      scene.data.set(DataKey.SHOW_CAPTURE_FLAG_PLACEHOLDER, { visibility: false });
      scene.GetObject<Phaser.GameObjects.Sprite>("obj_captureFlagPlaceholder")?.setVisible(false);
      container.resolve(PointerModeContext).setStrategy(container.resolve(DefaultPointerModeStrategy));
      scene.AddObject(scene.add.particles(pointer.worldX, pointer.worldY));
      return;
    }
    container.resolve(NetworkManager).sendEventToServer(
      PacketType.ByClient.CAPTURE_FLAG_CREATE_REQUESTED,
      { x: pointer.worldX, y: pointer.worldY }
    );
  }

  pointermove(scene: GameScene, pointer: Phaser.Input.Pointer): void {
    scene
      .GetObject<Phaser.GameObjects.Sprite>("obj_captureFlagPlaceholder")
      ?.setPosition(pointer.worldX, pointer.worldY);
  }

  pointerup(): void {}
  pointerout(): void {}
}
