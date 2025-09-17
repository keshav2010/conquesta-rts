import { injectable, container, inject } from "tsyringe";
import { PacketType } from "../../../common/PacketType";
import { CaptureFlag } from "../../gameObjects/CaptureFlag";
import { NetworkManager } from "../../network/NetworkManager";
import { GameScene } from "../../scenes/GameScene";
import { Spearman } from "../../soldiers/Spearman";
import { IPointerStrategy } from "../pointerStrategy";
import { DataKey } from "../../config/DataKey";
import { PointerModeContext } from "./PointerModeContext";

let selectorDraw = false;
let pointerDownWorldSpace: { x: number; y: number } | null = null;
const selectorColor = 0xffffff;
const selectorThickness = 1;

@injectable()
export class DefaultPointerModeStrategy implements IPointerStrategy {
  readonly name: string = "default-strategy"
  constructor(
    @inject(PointerModeContext) private context: PointerModeContext
  ){
  }

  pointerdown(scene: GameScene, pointer: Phaser.Input.Pointer): void {
    console.log(`[DefaultPointerStrategy] BTN:${pointer.button} pointerdown`)
    const selectorGraphics = scene.GetObject<Phaser.GameObjects.Graphics>(
      "obj_selectorGraphics"
    );
    if (!selectorGraphics) return;

    const selectedObjectsMap = scene.data.get(DataKey.SELECTED_OBJECTS_MAP) as Map<
      string,
      Spearman | CaptureFlag
    >;

    if (pointer.button === 0) {
      // Left Mouse Button
      selectorGraphics.clear();
      selectedObjectsMap.clear();

      selectorDraw = true;
      pointerDownWorldSpace = { x: pointer.worldX, y: pointer.worldY };
    } else if (pointer.button === 1) {
      // Middle Mouse Button → Soldier spawn
      const networkManager = container.resolve(NetworkManager);
      networkManager.sendEventToServer(
        PacketType.ByClient.SOLDIER_CREATE_REQUESTED,
        { soldierType: "SPEARMAN" }
      );
    } else if (pointer.button === 2) {
      // Right Mouse Button → Move/Attack logic
      if (selectedObjectsMap.size < 1) return;
      const networkManager = container.resolve(NetworkManager);

      const circle = new Phaser.Geom.Circle(pointer.worldX, pointer.worldY, 16);
      selectorGraphics.strokeCircleShape(circle);

      const soldiers = scene.GetObjectsWithKeyPrefix<Spearman>("obj_spearman_");
      const targetSoldiersArray = soldiers.filter(
        (s) => s.playerId !== networkManager.getClientId()
      );

      let targetSoldierSelected = null;
      for (const soldier of targetSoldiersArray) {
        const bound = soldier.getBounds();
        selectorGraphics.strokeRectShape(bound);
        if (Phaser.Geom.Intersects.CircleToRectangle(circle, bound)) {
          targetSoldierSelected = soldier;
          break;
        }
      }

      if (!targetSoldierSelected) {
        networkManager.sendEventToServer(
          PacketType.ByClient.SOLDIER_MOVE_REQUESTED,
          {
            soldierIds: Array.from(selectedObjectsMap.values()).map((v) => v.id),
            expectedPositionX: pointer.worldX,
            expectedPositionY: pointer.worldY,
          }
        );
        return;
      }

      const selectedSoldierIds = Array.from(selectedObjectsMap.values()).map(
        (s) => s.id
      );
      networkManager.sendEventToServer(
        PacketType.ByClient.SOLDIER_ATTACK_REQUESTED,
        {
          soldiers: selectedSoldierIds,
          targetPlayerId: targetSoldierSelected.playerId,
          targetUnitId: targetSoldierSelected.id,
        }
      );
    }
  }

  pointermove(scene: GameScene, pointer: Phaser.Input.Pointer): void {
    // console.log(`[DefaultPointerStrategy] BTN:${pointer.button} pointermove`)

    const selectorGraphics = scene.GetObject<Phaser.GameObjects.Graphics>(
      "obj_selectorGraphics"
    )!;
    if (!pointer.isDown) {
      selectorGraphics.clear();
      return;
    }

    if (selectorDraw && pointer.button === 0) {
      selectorGraphics.clear();
      selectorGraphics.lineStyle(selectorThickness, selectorColor, 1);

      let rect = new Phaser.Geom.Rectangle(
        pointerDownWorldSpace?.x!,
        pointerDownWorldSpace?.y!,
        pointer.worldX - pointerDownWorldSpace!.x,
        pointer.worldY - pointerDownWorldSpace!.y
      );
      if (rect.width < 0) {
        rect.x += rect.width;
        rect.width = Math.abs(rect.width);
      }
      if (rect.height < 0) {
        rect.y += rect.height;
        rect.height = Math.abs(rect.height);
      }
      selectorGraphics.strokeRectShape(rect);

      const networkManager = container.resolve(NetworkManager);
      const playerId = networkManager.getClientId();
      if (!playerId) return;

      const soldiers = scene.GetObjectsWithKeyPrefix<Spearman>(
        `obj_spearman_${playerId}_`
      );
      const captureFlags = scene.GetObjectsWithKeyPrefix<CaptureFlag>(
        `obj_captureFlag_${playerId}`
      );

      [...soldiers, ...captureFlags].forEach((obj) => {
        let bound = obj.getBounds();
        if (Phaser.Geom.Intersects.RectangleToRectangle(bound, rect)) {
          obj.markSelected();
        } else {
          obj.markUnselected();
        }
      });
    } else if (pointer.button === 2 && pointer.isDown) {
      // RMB drag → camera move
      scene.cameras.main.scrollX -=
        (pointer.x - pointer.prevPosition.x) / scene.cameras.main.zoom;
      scene.cameras.main.scrollY -=
        (pointer.y - pointer.prevPosition.y) / scene.cameras.main.zoom;
    }
  }

  pointerup(scene: GameScene, pointer: Phaser.Input.Pointer): void {
    console.log(`[DefaultPointerStrategy] BTN:${pointer.button} pointerup`)

    const selectorGraphics = scene.GetObject<Phaser.GameObjects.Graphics>(
      "obj_selectorGraphics"
    )!;
    selectorDraw = false;
    selectorGraphics.clear();
    pointerDownWorldSpace = null;
  }

  pointerout(): void {}
}
