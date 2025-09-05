import { PacketType } from "../../common/PacketType";
import { PlayerState } from "../../gameserver/schema/PlayerState";
import { SoldierState } from "../../gameserver/schema/SoldierState";
import { NetworkManager } from "../network/NetworkManager";
import CONSTANT from "../constant";
const { GAMEEVENTS } = CONSTANT;
import SessionStateClientHelpers from "../helpers/SessionStateClientHelpers";
import { BaseSoldier } from "../soldiers/BaseSoldier";
import { Spearman } from "../soldiers/Spearman";
import { BaseScene, SelectableSceneEntity } from "./BaseScene";
import SpinnerPlugin from "phaser3-rex-plugins/templates/spinner/spinner-plugin.js";
import $ from "jquery";
import { CaptureFlag } from "../gameObjects/CaptureFlag";
import { PlayerCastle } from "../gameObjects/PlayerCastle";
import { container } from "tsyringe";

var selectorColor = 0xffff00;
var selectorThickness = 2;
var selectorDraw = false;

var pointerDownWorldSpace: { x: any; y: any } | null = null;

const SendChatMessage = () => {
  try {
    var messageText = $("#chat-message").val();
    const networkManager = container.resolve(NetworkManager)
    networkManager.sendEventToServer(PacketType.ByClient.CLIENT_SENT_CHAT, {
      message: messageText,
    });
  } catch (err) {
    console.error(err);
  }
};
const addNewChatMessage = (msg: string, sender: string) => {
  let msgBlock = `<div>
        <div class="d-flex justify-content-between">
            <p class="small mb-1">${sender}</p>
        </div>
        <div class="d-flex flex-row justify-content-start">
            <div>
                <p style="background-color: #f5f6f7;">
                    ${msg}
                </p>
            </div>
        </div>
    </div>`;
  $(".chat-body").append(msgBlock);
};
$(() => {
  $("#send-chat-btn").on("click", function () {
    SendChatMessage();
  });
});

export const Textures = {
  PLAY_BUTTON: "playbutton",
  EXIT_BUTTON: "exitbutton",
  SOLDIER_BUTTON: "soldierbutton",
  TRACK: "track",
  KNIGHT: "knight",
  SPEARMAN: "spearman",
  CASTLE: "castle",
  GROUNDTILES: "groundtiles",
  CAPTUREFLAG: "captureFlag",
  CAPTUREFLAG_BUTTON: "img_captureFlagButton",
  DELETE_BUTTON: "img_deleteButton"
} as const;

export const DataKey = {
  SELECTED_OBJECTS_MAP: "selectedObjectsMap",
  TILEMAP: "map1",
  SHOW_CAPTURE_FLAG_PLACEHOLDER: "showCaptureFlagPlaceholder",
};

enum PointerMode {
  DEFAULT = "default",
  FLAG_PLACEMENT = "flagPlacementMode",
}

interface IPointerModeAction {
  [key: string]: {
    [key: string]: (scene: GameScene, pointer: Phaser.Input.Pointer) => void;
  };
}

const PointerModeAction: IPointerModeAction = {
  [PointerMode.DEFAULT]: {
    pointerdown: function (scene: GameScene, pointer: Phaser.Input.Pointer) {
      const selectorGraphics = scene.GetObject<Phaser.GameObjects.Graphics>(
        "obj_selectorGraphics"
      );
      if (!selectorGraphics) {
        return;
      }

      const selectedObjectsMap = scene.data.get(
        DataKey.SELECTED_OBJECTS_MAP
      ) as Map<string, BaseSoldier | CaptureFlag>;

      if (pointer.button === 0) {
        //lmb
        selectorGraphics.clear();
        selectedObjectsMap.clear();

        selectorDraw = true;
        pointerDownWorldSpace = {
          x: pointer.worldX,
          y: pointer.worldY,
        };
      }
      //mmb
      else if (pointer.button === 1) {
        const networkManager = container.resolve(NetworkManager);
        networkManager.sendEventToServer(
          PacketType.ByClient.SOLDIER_CREATE_REQUESTED,
          {
            soldierType: "SPEARMAN",
          }
        );
      }
      else if (pointer.button === 2) {
        /* RMB Pressed => Player either attempting to move selected soldiers or commanding them to attack enemy unit */
        if (selectedObjectsMap.size < 1) return;
        const networkManager = container.resolve(NetworkManager);

        const circle = new Phaser.Geom.Circle(
          pointer.worldX,
          pointer.worldY,
          16
        );
        selectorGraphics.strokeCircleShape(circle);

        const soldiers =
          scene.GetObjectsWithKeyPrefix<Spearman>(`obj_spearman_`);

        const targetSoldiersArray = soldiers.filter(
          (soldier) => soldier.playerId !== networkManager.getClientId()
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

        // no target soldier selected, is a move request instead.
        if (!targetSoldierSelected) {
          networkManager.sendEventToServer(
            PacketType.ByClient.SOLDIER_MOVE_REQUESTED,
            {
              soldierIds: Array.from(selectedObjectsMap.values()).map(
                (v) => v.id
              ),
              expectedPositionX: pointer.worldX,
              expectedPositionY: pointer.worldY,
            }
          );
          return;
        }

        const selectedSoldierIds = Array.from(selectedObjectsMap.values()).map(
          (soldier) => soldier.id
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
    },
    pointermove: function (scene: GameScene, pointer: Phaser.Input.Pointer) {
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
          pointerDownWorldSpace?.x,
          pointerDownWorldSpace?.y,
          pointer.worldX - pointerDownWorldSpace?.x,
          pointer.worldY - pointerDownWorldSpace?.y
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
        if (!playerId) {
          return;
        }
        // get all selectable items for a player
        const soldiers = scene.GetObjectsWithKeyPrefix<Spearman>(
          `obj_spearman_${playerId}_`
        );
        const captureFlags = scene.GetObjectsWithKeyPrefix<CaptureFlag>(
          `obj_captureFlag_${playerId}`
        );

        const selectables: (SelectableSceneEntity & Phaser.GameObjects.Sprite)[] = [
          ...soldiers,
          ...captureFlags,
        ];
        selectables.forEach((selectableSprite) => {
          let bound = selectableSprite.getBounds();
          if (Phaser.Geom.Intersects.RectangleToRectangle(bound, rect)) {
            selectableSprite.markSelected();
          } else {
            selectableSprite.markUnselected();
          }
        });
      } else if (pointer.button === 2 && pointer.isDown) {
        //mmb down
        scene.cameras.main.scrollX -=
          (pointer.x - pointer.prevPosition.x) / scene.cameras.main.zoom;
        scene.cameras.main.scrollY -=
          (pointer.y - pointer.prevPosition.y) / scene.cameras.main.zoom;
      }
    },
    pointerup: function (scene: GameScene, event: Phaser.Input.Pointer) {
      const selectorGraphics = scene.GetObject<Phaser.GameObjects.Graphics>(
        "obj_selectorGraphics"
      )!;
      selectorDraw = false;
      selectorGraphics.clear();
      pointerDownWorldSpace = null;
    },
    pointerout: function (scene: GameScene, event: Phaser.Input.Pointer) { },
  },
  [PointerMode.FLAG_PLACEMENT]: {
    pointerdown: function (scene: GameScene, pointer: Phaser.Input.Pointer) {
      const buttonPressed = pointer.button; // (0,1,2) => (lmb, mmb, rmb)
      const networkManager = container.resolve(NetworkManager);

      if (buttonPressed !== 0) {
        scene.data.set(DataKey.SHOW_CAPTURE_FLAG_PLACEHOLDER, {
          visibility: false,
        });
        scene.AddObject(scene.add.particles(pointer.worldX, pointer.worldY));
        return;
      }
      networkManager.sendEventToServer(
        PacketType.ByClient.CAPTURE_FLAG_CREATE_REQUESTED,
        {
          x: pointer.worldX,
          y: pointer.worldY,
        }
      );
    },
    pointerup: function (scene: GameScene, pointer: Phaser.Input.Pointer) { },
    pointerout: function (scene: GameScene, pointer: Phaser.Input.Pointer) { },
    pointermove: function (scene: GameScene, pointer: Phaser.Input.Pointer) {
      scene
        .GetObject<Phaser.GameObjects.Sprite>("obj_captureFlagPlaceholder")
        ?.setPosition(pointer.worldX, pointer.worldY);
    },
  },
};

export class GameScene extends BaseScene {
  canvasWidth: number;
  canvasHeight: number;
  controls?: Phaser.Cameras.Controls.SmoothedKeyControl;
  rexSpinner: SpinnerPlugin | undefined;

  pointerMode: PointerMode = PointerMode.DEFAULT;
  constructor() {
    super(CONSTANT.SCENES.GAME);
    this.canvasWidth = 1962;
    this.canvasHeight = 1962;
  }

  preload() {
    this.data.set(
      DataKey.SELECTED_OBJECTS_MAP,
      new Map<string, BaseSoldier | CaptureFlag>()
    );
    this.load.image(Textures.PLAY_BUTTON, "../assets/playbutton.png");
    this.load.image(Textures.KNIGHT, "../assets/knight32x32.png");
    this.load.image(Textures.SPEARMAN, "../assets/spearman32x32.png");
    this.load.image(Textures.CASTLE, "../assets/castle.png");
    this.load.image(Textures.GROUNDTILES, "../assets/groundtiles.png");
    this.load.image(Textures.CAPTUREFLAG, "../assets/btnFlag32x32.png");
    this.load.scenePlugin({
      key: "rexSpinner",
      url: SpinnerPlugin,
      sceneKey: "rexSpinner",
    });
  }

  onSoldierAdded(soldier: SoldierState, ownerPlayer: PlayerState) {
    const spearmen = new Spearman(
      this,
      soldier.id,
      soldier.currentPosition.x,
      soldier.currentPosition.y,
      Textures.SPEARMAN,
      null,
      new Phaser.Math.Vector3(
        ownerPlayer.color.x,
        ownerPlayer.color.y,
        ownerPlayer.color.z
      ),
      ownerPlayer.id
    );
    this.AddObject<BaseSoldier>(
      spearmen,
      `obj_spearman_${ownerPlayer.id}_${soldier.id}`
    );
  }

  onSoldierRemoved(soldierId: string, playerId: string) {
    try {
      // remove from selected soldier list if is selected
      const selectedObjectsMap = this.data.get(
        DataKey.SELECTED_OBJECTS_MAP
      ) as Map<string, BaseSoldier | CaptureFlag>;
      selectedObjectsMap.delete(soldierId);

      const isSoldierRemoved = this.DestroyObjectById(`obj_spearman_${playerId}_${soldierId}`);
      console.log(
        `Removed Soldier from scene : ${soldierId} , for player : ${playerId} : isRemoved = ${isSoldierRemoved}`
      );
    } catch (error) {
      console.log(error);
    }
  }

  onSoldierSelected(soldierId: string) {
    const networkManager = container.resolve(NetworkManager);

    const playerId = networkManager.getClientId();
    if (!playerId) {
      return;
    }

    const selectedObjectsMap = this.data.get(
      DataKey.SELECTED_OBJECTS_MAP
    ) as Map<string, BaseSoldier | CaptureFlag>;

    const soldierPhaserObj = this.GetObject<Spearman>(
      `obj_spearman_${playerId}_${soldierId}`
    );
    if (!soldierPhaserObj) return;
    selectedObjectsMap.set(soldierId, soldierPhaserObj);
  }

  onSoldierUnselected(soldierId: string) {
    const selectedObjectsMap = <Map<string, BaseSoldier | CaptureFlag>>(
      this.data.get(DataKey.SELECTED_OBJECTS_MAP)
    );
    selectedObjectsMap.delete(soldierId);
  }

  onCaptureFlagSelected(flagId: string) {
    const networkManager = container.resolve(NetworkManager);

    const playerId = networkManager.getClientId();
    if (!playerId) {
      return;
    }

    const selectedObjectsMap = this.data.get(
      DataKey.SELECTED_OBJECTS_MAP
    ) as Map<string, BaseSoldier | CaptureFlag>;

    const selectedCaptureFlag = this.GetObject<CaptureFlag>(
      `obj_captureFlag_${playerId}_${flagId}`
    );

    if (!selectedCaptureFlag) return;
    selectedObjectsMap.set(flagId, selectedCaptureFlag);
  }

  onCaptureFlagUnselected(flagId: string) { }

  onSoldierPositionChanged(playerId: string, soldierId: string) {
    const phaserSceneObject = this.GetObject<Spearman>(
      `obj_spearman_${playerId}_${soldierId}`
    );
    const networkManager = container.resolve(NetworkManager);

    const state = networkManager.getState();
    if (!state) return;
    const playerState = SessionStateClientHelpers.getPlayer(state, playerId);
    if (!playerState) return;
    const soldierState = SessionStateClientHelpers.getSoldier(
      state,
      playerState,
      soldierId
    );
    if (!soldierState) {
      console.log("Soldier not found in server state");
      return;
    }
    if (!phaserSceneObject) {
      console.error(
        `No Phaser Object Found (soldier: ${soldierId})/ playerId: ${playerId}`
      );
      return;
    }

    phaserSceneObject.setServerPosition(
      soldierState.currentPosition.x,
      soldierState.currentPosition.y
    );
  }

  onSoldierHealthUpdate(
    soldier: SoldierState,
    value: number,
    prevValue: number
  ) {
    this.GetObject<Spearman>(
      `obj_spearman_${soldier.playerId}_${soldier.id}`
    )?.setHealth(value);
  }

  create() {
    const networkManager = container.resolve(NetworkManager);
    const GameSessionState = networkManager.getState();

    if (!GameSessionState) {
      networkManager.disconnectGameServer();
      return;
    }

    const parsedMap = networkManager.getMapData();
    if (!parsedMap) {
      console.error("Failed to parse map");
      networkManager.disconnectGameServer();
      return;
    }
    const tilemap = networkManager.getState()!.tilemap;
    const map = this.setupSceneTilemap(
      parsedMap!,
      tilemap.tileheight,
      tilemap.tilemapHeight
    );
    this.data.set(DataKey.TILEMAP, map);

    // render tilemap with initial data
    for (
      let tileId = 0;
      tileId < GameSessionState.tilemap.ownershipTilemap1D.length;
      tileId++
    ) {
      this.updateTilemap(
        networkManager,
        GameSessionState.tilemap.ownershipTilemap1D[tileId],
        tileId
      );
    }

    // update tilemap for every tile update received.
    this.AddStateChangeListener(
      GameSessionState.tilemap.ownershipTilemap1D.onChange(
        (owner, tile1DIndex) => {
          this.updateTilemap(networkManager, owner, tile1DIndex);
        }
      )
    );

    const stylus = this.add.graphics();
    stylus.setDepth(9999);

    const debug_painter = this.add.graphics();
    debug_painter.setDepth(10000);
    this.AddObject(stylus, "obj_selectorGraphics");
    this.AddObject(debug_painter, "obj_brush");

    this.data.set("map1", map);

    networkManager.room?.onLeave((code) => {
      console.log(`Disconnecting [code: ${code}]`);
      this.scene.stop(CONSTANT.SCENES.HUD_SCORE);
      this.scene.start(CONSTANT.SCENES.MENU);
    });

    this.AddInputEvent("pointerdown", (pointer: Phaser.Input.Pointer) => {
      PointerModeAction[this.pointerMode]["pointerdown"](this, pointer);
    });

    this.AddInputEvent("pointerup", (pointer: Phaser.Input.Pointer) => {
      PointerModeAction[this.pointerMode]["pointerup"](this, pointer);
    });

    this.AddInputEvent("pointermove", (pointer: any) => {
      PointerModeAction[this.pointerMode]["pointermove"](this, pointer);
    });

    this.AddSceneEvent(PacketType.ByServer.GAME_OVER, (data: { winningPlayerId: string }) => {
      const clientId = networkManager.getClientId();
      const isWinner = data.winningPlayerId === clientId;
      // Create a simple popup using Phaser DOM element
      const popupHtml = `
        <div id="gameover-popup" style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:350px;height:200px;background:rgba(255,255,255,0.95);border-radius:16px;box-shadow:0 2px 16px #0008;">
          <h2 style='color:${isWinner ? "#28a745" : "#dc3545"};margin-top:32px;'>${isWinner ? "You Won!" : "You Lost!"}</h2>
          <button id="btn-back-menu" style="margin-top:32px;padding:12px 32px;font-size:18px;border-radius:8px;background:#007bff;color:white;border:none;cursor:pointer;">Back to Menu</button>
        </div>
      `;
      const dom = this.add.dom(this.cameras.main.centerX, this.cameras.main.centerY).createFromHTML(popupHtml);
      dom.setOrigin(0.5, 0.5);
      dom.setDepth(10001);
      dom.setScrollFactor(0);
      this.input.enabled = false; // Prevent further game input
      // Button event
      const btn = dom.getChildByID("btn-back-menu");
      btn?.addEventListener("click", () => {
        dom.destroy();
        this.input.enabled = true;
        this.scene.stop(CONSTANT.SCENES.HUD_SCORE);
        this.scene.start(CONSTANT.SCENES.MENU);
      });
    });

    this.scene.launch(CONSTANT.SCENES.HUD_SCORE);

    this.cameras.main
      .setBounds(
        -this.canvasWidth / 2,
        -this.canvasHeight / 2,
        this.canvasWidth * 2,
        this.canvasHeight * 2
      )
      .setName("WorldCamera");
    this.cameras.main.setBackgroundColor("rgba(255,255,255,0.3)");

    const cursors = this.input.keyboard?.createCursorKeys();
    const controlConfig: Phaser.Types.Cameras.Controls.SmoothedKeyControlConfig = {
      camera: this.cameras.main,
      left: cursors!.left,
      right: cursors!.right,
      up: cursors!.up,
      down: cursors!.down,
      zoomIn: this.input.keyboard?.addKey('W'),
      zoomOut: this.input.keyboard?.addKey('S'),
      zoomSpeed: 0.02,
      drag: 0.0001,
      acceleration: 0.0005,
      maxSpeed: 0.1,
    };
    const cameraControl = new Phaser.Cameras.Controls.SmoothedKeyControl(
      controlConfig
    );
    this.controls = this.AddObject(cameraControl, "obj_cameraControl");

    this.AddSceneEvent(
      PacketType.ByServer.NEW_CHAT_MESSAGE,
      (data: { message: string; senderName: string; sender: string }) => {
        const { message, senderName } = data;
        addNewChatMessage(message, senderName);
      }
    );

    this.AddSceneEvent(
      GAMEEVENTS.DELETE_SELECTED_OBJECTS, () => {
        const selectedObjectsMap = this.data.get(
          DataKey.SELECTED_OBJECTS_MAP
        ) as Map<string, BaseSoldier | CaptureFlag>;

        let soldierIds = [];
        let captureFlagIds = [];
        for (let selectedObject of selectedObjectsMap.values()) {
          if (selectedObject instanceof BaseSoldier) {
            soldierIds.push(selectedObject.id);
          }
          else if (selectedObject instanceof CaptureFlag)
            captureFlagIds.push(selectedObject.id);
        }
        networkManager.sendEventToServer(
          PacketType.ByClient.SOLDIERS_DELETE_REQUESTED,
          {
            soldierIds,
          }
        );
        networkManager.sendEventToServer(
          PacketType.ByClient.CAPTURE_FLAG_DELETE_REQUESTED,
          {
            captureFlagIds,
          }
        );
      }
    );

    this.AddSceneEvent(CONSTANT.GAMEEVENTS.CREATE_CAPTURE_FLAG_BUTTON_CLICKED, () => {
      this.pointerMode = PointerMode.FLAG_PLACEMENT;
      this.GetObject<Phaser.GameObjects.Sprite>(
        "obj_captureFlagPlaceholder"
      )?.setVisible(true);
    });

    this.data.events.on(
      `changedata-${DataKey.SHOW_CAPTURE_FLAG_PLACEHOLDER}`,
      (_: any, value: any) => {
        if (value.visibility === false)
          this.pointerMode = PointerMode.DEFAULT;

        this.GetObject<Phaser.GameObjects.Sprite>(
          "obj_captureFlagPlaceholder"
        )?.setVisible(false);
      }
    );

    const state = networkManager.getState();
    if (!state) return;

    const player = SessionStateClientHelpers.getPlayer(
      state,
      networkManager.getClientId()!
    );
    const players = SessionStateClientHelpers.getPlayers(state);
    if (!player || !networkManager.room || !players || players.length === 0) {
      console.error(`Client not connected to server anymore`);
      this.scene.start(CONSTANT.SCENES.MENU);
      return;
    }

    const flagPlaceholder = new CaptureFlag(
      this,
      0,
      0,
      "placeholder",
      Textures.CAPTUREFLAG,
      0,
      player
    );
    flagPlaceholder.setVisible(false);
    this.AddObject<Phaser.GameObjects.Sprite>(
      flagPlaceholder,
      "obj_captureFlagPlaceholder"
    );
    this.AddStateChangeListener(
      player!.spawnRequestQueue.onChange((item, key) => {
        this.events.emit(PacketType.ByServer.SOLDIER_SPAWN_SCHEDULED, {
          playerId: player,
          queueSize: player.spawnRequestQueue.length,
        });
      })
    );

    // register soldier creation/removal listeners for eaech player.
    players.forEach((player) => {

      this.AddStateChangeListener(
        player.listen("castleHealth", (value: number) => {
          const kingdomId = `obj_playerCastle_${player.id}`;
          const playerCastle = this.GetObject<PlayerCastle>(kingdomId);
          playerCastle?.setHealth(value);
        })
      );

      this.AddStateChangeListener(
        player.soldiers.onAdd((soldier, key) => {
          this.onSoldierAdded(soldier, player);

          // add relevant listeners for every soldier
          this.AddStateChangeListener(
            soldier.listen("health", (value, prevValue) => {
              this.onSoldierHealthUpdate(soldier, value, prevValue);
            }),
            `health-${soldier.id}`
          );

          this.AddStateChangeListener(
            soldier.currentPosition.onChange(() => {
              this.onSoldierPositionChanged(player.id, soldier.id);
            }),
            `currentPos-${soldier.id}`
          );
        })
      );

      this.AddStateChangeListener(
        player.soldiers.onRemove((soldier, key) => {
          const soldierId = soldier.id;
          console.log(
            `[state change detected - soldier onRemove] player ${player.id} removed soldier ${soldier.id}]`
          );
          // remove relevant listeners for each soldier.
          this.DestroyStateChangeListener(`health-${soldierId}`);
          this.DestroyStateChangeListener(`currentPos-${soldierId}`);

          this.onSoldierRemoved(soldierId, player.id);
        })
      );

      // new capture flag added
      this.AddStateChangeListener(
        player.captureFlags.onAdd((newFlag) => {
          // register listener for health change
          const cleanupMethod = newFlag.onChange(() => {
            const healthValue = newFlag.health;
            const flagObjectKey = `obj_captureFlag_${player.id}_${newFlag.id}`;
            const flagObject = this.GetObject<CaptureFlag>(flagObjectKey);
            flagObject?.setHealth(healthValue);
          });
          this.AddStateChangeListener(
            cleanupMethod,
            `statechange_captureFlag_${player.id}_${newFlag.id}`
          );
          const flag = new CaptureFlag(
            this,
            newFlag.pos.x,
            newFlag.pos.y,
            newFlag.id,
            Textures.CAPTUREFLAG,
            0,
            player,
            newFlag
          );

          if (networkManager.getClientId() === player.id) {
            flag.setTint(0x00ff00);
          } else flag.setTint(0xff0000);

          this.AddObject(flag, `obj_captureFlag_${player.id}_${newFlag.id}`);
        })
      );

      // capture flag removed/destroyed
      this.AddStateChangeListener(
        player.captureFlags.onRemove((newFlag) => {
          const flag = this.GetObject<CaptureFlag>(
            `obj_captureFlag_${player.id}_${newFlag.id}`
          );
          if (!flag) return;
          this.DestroyObjectById(`obj_captureFlag_${player.id}_${flag.id}`);
          this.DestroyStateChangeListener(
            `statechange_captureFlag_${player.id}_${flag.id}`
          );
        })
      );
    });

    this.AddStateChangeListener(
      state.players.onRemove((player) => {
        const kingdomId = `obj_playerCastle_${player.id}`;
        this.DestroyObjectById(kingdomId);
        this.events.emit(PacketType.ByServer.PLAYER_LEFT, {
          playerState: player,
        });
      })
    );

    this.AddStateChangeListener(
      networkManager.getState()?.listen("sessionState", (value) => {
        if (value === "BATTLE_END_STATE") {
          this.scene.start(CONSTANT.SCENES.MENU);
        }
      })!
    );

    this.AddStateChangeListener(
      player.listen("resources", (value) => {
        this.events.emit(PacketType.ByServer.PLAYER_RESOURCE_UPDATED, {
          playerId: networkManager.getClientId()!,
          resources: value,
          resourceGrowthRate: player.resourceGrowthRateHz,
        });
      })
    );

    this.AddStateChangeListener(
      player.spawnRequestDetailMap.onAdd((item, key) => {
        this.AddStateChangeListener(
          item.onChange(() => {
            this.events.emit(
              PacketType.ByServer.SOLDIER_SPAWN_REQUEST_UPDATED,
              {
                count: item.count,
                countdown: item.countdown,
                requestId: item.requestId,
                unitType: item.unitType,
              }
            );
          }),
          `${item.requestId}`
        );
      })
    );

    this.AddStateChangeListener(
      player.spawnRequestDetailMap.onRemove((item, key) => {
        this.DestroyStateChangeListener(item.requestId);
      })
    );

    this.AddSceneEvent(GAMEEVENTS.SOLDIER_SELECTED, (soldier: BaseSoldier) => {
      this.onSoldierSelected(soldier.id);
    });

    this.AddSceneEvent(GAMEEVENTS.CAPTURE_FLAG_SELECTED, (cf: CaptureFlag) => {
      this.onCaptureFlagSelected(cf.id);
    });

    this.AddInputEvent(
      "wheel",
      (
        pointer: any,
        gameobjects: any,
        deltaX: number,
        deltaY: number,
        deltaZ: number
      ) => {
        this.cameras.main.setZoom(
          Math.max(0, this.cameras.main.zoom - deltaY * 0.0003)
        );
      }
    );

    //show initial spawnpoint choice on map for player
    networkManager.getState()?.players.forEach((player) => {
      const objKey = `obj_playerCastle_${player.id}`;
      this.AddObject(
        new PlayerCastle(
          this,
          player.pos.x,
          player.pos.y,
          Textures.CASTLE,
          0,
          player
        ),
        objKey
      );
    });

    this.AddSceneEvent("shutdown", (data: any) => {
      console.log("shutdown ", data.config.key);
      this.Destroy();
    });
    this.AddSceneEvent("destroy", () => {
      this.input.removeAllListeners();
      this.events.removeAllListeners();
    });

    // --- Network status overlay ---
    let networkStatusDom: Phaser.GameObjects.DOMElement | null = null;
    let spinner: any = null;
    let networkOverlayVisible = true;
    const showNetworkOverlay = () => {
      if (networkOverlayVisible) return;
      networkOverlayVisible = true;
      // Use cached HTML for overlay
      networkStatusDom = this.add.dom(this.cameras.main.centerX, this.cameras.main.centerY).createFromCache("network-status-overlay");
      networkStatusDom.setOrigin(0.5, 0.5);
      networkStatusDom.setDepth(10002);
      networkStatusDom.setScrollFactor(0);
      this.input.enabled = false;
      // Add spinner to the spinner-container using the plugin instance
      spinner = this.rexSpinner!.add.spinner({
        width: 48,
        height: 48,
        duration: 800,
        x: 0,
        y: 0,
      });
      this.AddObject(spinner, 'obj_networkOverlaySpinner');
      if (spinner) {
        spinner.setDepth(10003);
        spinner.setOrigin(0.5, 0.5);
        spinner.setVisible(true);
        // Attach spinner's canvas to the overlay
        const domNode = networkStatusDom.node as HTMLElement;
        const spinnerContainer = domNode.querySelector('#spinner-container');
        if (spinnerContainer && spinner.canvas) {
          spinnerContainer.appendChild(spinner.canvas);
        }
      }
    };
    const hideNetworkOverlay = () => {
      if (!networkOverlayVisible) return;
      networkOverlayVisible = false;
      networkStatusDom?.destroy();
      networkStatusDom = null;
      if (spinner) {
        spinner.destroy();
        spinner = null;
        this.DestroyObjectById('obj_networkOverlaySpinner');
      }
      this.input.enabled = true;
    };
    // Listen for disconnects/errors
    if (networkManager.room) {
      networkManager.room.onError((code, message) => {
        showNetworkOverlay();
      });
      networkManager.room.onLeave((code) => {
        showNetworkOverlay();
      });
    }
    // Periodically check connection
    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (!networkManager.isSocketConnected()) {
          showNetworkOverlay();
        } else {
          hideNetworkOverlay();
        }
      },
    });

    // Listen for browser network changes
    window.addEventListener('offline', showNetworkOverlay);
    window.addEventListener('online', hideNetworkOverlay);
    this.events.on('shutdown', () => {
      window.removeEventListener('offline', showNetworkOverlay);
      window.removeEventListener('online', hideNetworkOverlay);
    });
  }

  update(delta: number) {
    this.controls?.update(delta);

    // for all spearman / soldiers
    const soldiers = this.GetObjectsWithKeyPrefix<Spearman>(`obj_spearman_`);
    for (let soldier of soldiers) {
      const serverPos = soldier.getServerPosition();
      soldier.setPosition(
        Phaser.Math.Linear(soldier.x, serverPos.x, BaseSoldier.LERP_RATE),
        Phaser.Math.Linear(soldier.y, serverPos.y, BaseSoldier.LERP_RATE)
      );
    }
  }
}
