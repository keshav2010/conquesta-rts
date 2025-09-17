import { injectable, container, inject } from "tsyringe";
import { NetworkManager } from "../../network/NetworkManager";
import { GameScene } from "../../scenes/GameScene";
import { PacketType } from "../../../common/PacketType";
import { IPointerStrategy } from "../pointerStrategy";
import { PointerModeContext } from "./PointerModeContext";
import { DefaultPointerModeStrategy } from "./DefaultPointerModeStrategy";
import { DataKey } from "../../config/DataKey";



@injectable()
export class FlagPlacementPointerModeStrategy implements IPointerStrategy {
  readonly name: string = "flag-policy";
  pointerdown(scene: GameScene, pointer: Phaser.Input.Pointer): void {
    console.log(`[FlagPlacementPointerStrategy] BTN:${pointer.button}(${typeof pointer.button}) pointerdown`)
    // go to default-pointer mode on right-click
    if (pointer.button === 2) {
      container.resolve(PointerModeContext).setStrategy(container.resolve(DefaultPointerModeStrategy));
      return;
    }
    
    const networkManager = container.resolve(NetworkManager);

    if (pointer.button !== 0) {
      scene.data.set(DataKey.SHOW_CAPTURE_FLAG_PLACEHOLDER, { visibility: false });
      scene.AddObject(scene.add.particles(pointer.worldX, pointer.worldY));
      return;
    }
    networkManager.sendEventToServer(
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
