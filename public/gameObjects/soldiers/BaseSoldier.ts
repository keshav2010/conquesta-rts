import CONSTANTS from "../../constant";
import SessionStateClientHelpers from "../../helpers/SessionStateClientHelpers";
import LoadingBar from "../LoadingBar";
import SAT from "sat";
import { NetworkManager } from "../../network/NetworkManager";
import { BackgroundHighlight } from "../BackgroundHighlight";
import { SelectableSceneEntity } from "../../scenes/BaseScene";
import { container } from "tsyringe";
import { BloodStain } from "../BloodStain";
import { SoldierDebugRenderer } from "./SoldierDebugRenderer";
import { SoldierUI } from "./SoldierUI";
import { SoldierStats } from "./SoldierStats";
const GAMEEVENTS = CONSTANTS.GAMEEVENTS;

// --- BaseSoldier.ts (refactored) ---
export abstract class BaseSoldier
  extends Phaser.GameObjects.Sprite
  implements SelectableSceneEntity
{
  readonly id: string;
  playerId: string | null;

  private stats: SoldierStats;
  private ui: SoldierUI;
  private debugRenderer: SoldierDebugRenderer;

  static LERP_RATE: number = 0.2;

  constructor(
    scene: Phaser.Scene,
    id: string,
    x: number,
    y: number,
    texture: string | Phaser.Textures.Texture,
    frame: string | number | undefined,
    color: Phaser.Math.Vector3,
    playerId: null | string
  ) {
    super(scene, x, y, texture, frame);
    this.id = id;
    this.playerId = playerId;

    scene.add.existing(this);
    this.setInteractive().setOrigin(0).setDepth(10);

    this.stats = new SoldierStats(100);
    this.ui = new SoldierUI(scene, this, color, id);
    this.debugRenderer = new SoldierDebugRenderer(scene);

    this.setServerPosition(x, y);

    this.on("destroy", () => {
      this.ui.destroy();
      this.debugRenderer.destroy();
      new BloodStain(this.scene, this.x, this.y);
      scene.events.off("update", this.update, this);
    });

    scene.events.on("update", this.update, this);
  }

  setHealth(value: number) {
    this.stats.setHealth(value);
  }

  setServerPosition(x: number, y: number) {
    this.setData("serverPosition", { x, y });
  }

  getServerPosition() {
    const data = this.getData("serverPosition") as { x: number; y: number };
    return new SAT.Vector(data.x, data.y);
  }

  update(delta: number) {
    this.ui.draw();
    this.ui.updatePosition(this);

    // Example: you’d get soldierState from session
    const state = "idle"; 
    this.ui.updateText(state, this.stats.getHealth());

    // debug rendering
    const serverPos = this.getServerPosition();

    const networkManager = container.resolve(NetworkManager);
    if(!networkManager)
      return;
    const playerState = SessionStateClientHelpers.getPlayer(networkManager.getState()!, this.playerId!);
    if(!playerState)
        return;
    const soldierState = SessionStateClientHelpers.getSoldier(networkManager.getState()!, playerState, this.id);
    if(!soldierState)
      return;
    
    this.debugRenderer.render(this, serverPos, { x: soldierState.expectedPosition.x, y: soldierState.expectedPosition.y });
  }

  markSelected() {
    this.alpha = 0.5;
    this.scene.events.emit(GAMEEVENTS.SOLDIER_SELECTED, this);
  }

  markUnselected() {
    if (!this.scene) return;
    this.alpha = 1;
    this.scene.events.emit(GAMEEVENTS.SOLDIER_UNSELECTED, this);
  }
}
