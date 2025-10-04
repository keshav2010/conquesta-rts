
import $ from "jquery";
import CONSTANT from "../constant";
import { BaseScene } from "./BaseScene";
import { PacketType } from "../../common/PacketType";
import { SoldierType } from "../../common/SoldierType";
import { GameScene, Textures } from "./GameScene";
import { NetworkManager } from "../network/NetworkManager";
import { PlayerState } from "../../gameserver/schema/PlayerState";
import { Spearman } from "../gameObjects/soldiers/Spearman";
import { CaptureFlag } from "../gameObjects/CaptureFlag";
import { container } from "tsyringe";
import { CameraFocusManager } from "../gameObjects/CameraFocusManager";
import Chatbox from "../gameObjects/ui/Chatbox";
import GameActionPanel from "../gameObjects/ui/GameActionPanel";
import LeaderboardPanel from "../gameObjects/ui/LeaderboardPanel";

const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
  color: "#fff",
  strokeThickness: 4,
  fontSize: 16,
  stroke: "#000000",
  fontFamily: "Helvetica",
};

const tooltipTextStyle : Phaser.Types.GameObjects.Text.TextStyle = {
  color: "#ff0",
  strokeThickness: 3,
  fontSize: 14,
  stroke: "#000000",
  wordWrap: {
    width: 250
  }
}

export class PlayerStatisticHUD extends BaseScene {
  leaderboardPanel: LeaderboardPanel | undefined;
  constructor() {
    super(CONSTANT.SCENES.HUD_SCORE);
  }
  preload() {
    this.load.image(Textures.PLAY_BUTTON, "../assets/playbutton.png");
    this.load.image(Textures.EXIT_BUTTON, "../assets/exitbutton.png");
    this.load.image(Textures.DELETE_BUTTON, "../assets/deletebutton.png");
    this.load.image(Textures.SOLDIER_BUTTON, "../assets/sprite.png");
    this.load.image(Textures.TRACK, "../assets/track.png");
    this.load.image(
      Textures.CAPTUREFLAG_BUTTON,
      "../assets/btnFlag32x32.png",
    );
    this.load.image(Textures.CAPTUREFLAG, "../assets/captureFlag.png");

    this.load.spritesheet("bar", "../assets/bar.png", {
      frameWidth: 44,
      frameHeight: 22,
    });
    this.load.html("soldierSelectionWidget", "../html/soldier-selection.html");
    this.load.html("phaserChatbox", "../html/phaser-chatbox.html");
    this.load.html("game-action-panel", "../html/game-action-panel.html");
    this.load.html("leaderboard-panel", "../html/match-leaderboard-panel.html");
    this.scene.bringToTop();
  }

  appendToLeaderboard(players : Array<PlayerState>) {
    const listEl = document.getElementById("leaderboard-list");
    if(!listEl)
      return;
    listEl.innerHTML = "";
    // sort players by score (descending)
    const sorted = [...players].sort((a, b) => b.score - a.score);

    sorted.forEach((p, idx) => {
      const item = document.createElement("div");
      item.className = "leaderboard-item";

      item.innerHTML = `
        <div class="leaderboard-rank">#${idx + 1}</div>
        <div class="leaderboard-name">${p.name}</div>
        <div class="leaderboard-score">${p.score}</div>
      `;

      listEl.appendChild(item);
    });
  }

  updateLeaderboardUI() {
    const networkManager = container.resolve(NetworkManager);
    const state = networkManager.getState()
    if(!state) return;
    const players = Array.from(state.players.values());
    this.leaderboardPanel?.update(players.map(player => (
        {
          name: player.name,
          score: player.score,
          playerId: player.id
        }
      )
    ));
  }

  create() {
    var gameScene = this.scene.get<GameScene>(CONSTANT.SCENES.GAME);
    const networkManager = container.resolve(NetworkManager)
    
    $("#soldierSelectionDiv #option_villager").on("click", () => {
      console.log("trying to create villager");
    });
    $("#soldierSelectionDiv #option_stoneman").on("click", () => {
      console.log("trying to create villager");
    });

    $("#soldierSelectionDiv #option_spearman").on("click", () => {
      networkManager.sendEventToServer(
        PacketType.ByClient.SOLDIER_SPAWN_REQUESTED,
        {
          soldierType: SoldierType.SPEARMAN,
        }
      );
    });

    $("#soldierSelectionDiv #option_knight").on("click", () => {
      networkManager.sendEventToServer(
        PacketType.ByClient.SOLDIER_SPAWN_REQUESTED,
        {
          soldierType: SoldierType.KNIGHT,
        }
      );
    });

    const resourceText = this.AddObject(
      this.add.text(10, 50, "Economy: 0", textStyle)
    );
    const soldierCount = this.AddObject(
      this.add.text(10, 80, "Soldiers: 0", textStyle)
    );
    const spawnQueueText = this.AddObject(
      this.add.text(10, 110, "", textStyle)
    );

    const Controls = this.AddObject(
      this.add.text(
        10,
        10,
        "Dev Testing [MMB => spawn soldier, drag n select units, RightClick for move/attack",
        textStyle
      )
    );

    
    // Setup Tooltip
    const tooltip = this.AddObject(
      this.add.text(0, 0, "", tooltipTextStyle).setVisible(false),
      "text_tooltip"
    );

    // TODO: optimise
    gameScene.AddSceneEvent(
      PacketType.ByServer.SOLDIER_CREATE_ACK,
      ({ isCreated }: { isCreated: boolean }) => {
        if (isCreated)
          soldierCount.setText(
            `Total Soldiers: ${[
              ...networkManager.getState()!.players.values(),
            ].reduce((acc, curr) => {
              acc = acc + curr.soldiers.size;
              return acc;
            }, 0)}`
          );
      }
    );

    gameScene.AddSceneEvent(
      PacketType.ByServer.PLAYER_LEFT,
      (data: { playerState: PlayerState }) => {
        console.log(`Player : ${data?.playerState?.id} Dropped.`);

        const state = networkManager.getState();
        if (!state) return;
        const playerObject = data.playerState;
        if (!playerObject) {
          return;
        }

        const soldiers = gameScene.GetObjectsWithKeyPrefix<Spearman>(
          `obj_spearman_${playerObject.id}_`
        );
        soldiers.forEach((soldier) => {
          gameScene.onSoldierRemoved(soldier.id, playerObject.id);
        });

        const captureFlags = gameScene.GetObjectsWithKeyPrefix<CaptureFlag>(
          `obj_captureFlag_${playerObject.id}`
        );
        captureFlags.forEach((flag) => flag.destroy(true));

        soldierCount.setText(
          `Total Soldiers: ${[...state.players.values()].reduce((acc, curr) => {
            acc = acc + curr.soldiers.size;
            return acc;
          }, 0)}`
        );
      }
    );

    this.AddObject(
      this.add.text(120, 80, "PING:0ms", textStyle),
      "obj_text_ping"
    );

    this.AddObject(
      this.add.text(50, 110, "Soldiers Queued: 0", textStyle),
      "obj_text_soldiersQueued"
    );
    this.AddObject(
      this.add.text(50, 140, "Next Spawn In: 0", textStyle),
      "obj_spawnETA"
    );

    gameScene.AddSceneEvent(
      PacketType.ByServer.SOLDIER_SPAWN_REQUEST_UPDATED,
      ({
        requestId,
        count,
        countdown,
        unitType,
      }: {
        requestId: string;
        count: number;
        countdown: number;
        unitType: string;
      }) => {
        const textObject =
          this.GetObject<Phaser.GameObjects.Text>("obj_spawnETA");
        textObject?.setText(
          `Spawning Next In : ${Math.floor(countdown)} X${count}`
        );
      }
    );

    networkManager.latencyService.onLatencyChange((data: number) => {
      this.GetObject<Phaser.GameObjects.Text>('obj_text_ping')?.setText(`PING:${data}!}`);
    });

    gameScene.AddSceneEvent(
      PacketType.ByServer.PLAYER_SCORE_UPDATED,
      ({
        playerId,
        score
      }: {
        playerId: string;
        score: number;
      }) => {
        try {
          console.log('received event for player score update ', playerId, score);
          this.updateLeaderboardUI();
        } catch (err) {
          console.log(err);
        }
      }
    );
    gameScene.AddSceneEvent(
      PacketType.ByServer.PLAYER_RESOURCE_UPDATED,
      ({
        playerId,
        resources,
        resourceGrowthRate,
      }: {
        playerId: string;
        resources: number;
        resourceGrowthRate: number;
      }) => {
        try {
          if (playerId === playerId)
            resourceText.setText(`Economy: ${resources.toFixed(2)} (change/sec: ${resourceGrowthRate.toFixed(2)})`);
        } catch (err) {
          console.log(err);
        }
      }
    );

    gameScene.AddSceneEvent(
      PacketType.ByServer.SOLDIER_SPAWN_SCHEDULED,
      ({ playerId, queueSize }: { playerId: string; queueSize: number }) => {
        this.GetObject<Phaser.GameObjects.Text>(
          "obj_text_soldiersQueued"
        )?.setText(`Soldiers Queued: ${queueSize}`);
      }
    );

    this.AddSceneEvent("shutdown", (data: any) => {
      console.log("shutdown ", data.config.key);
      this.Destroy();
    });
    this.AddSceneEvent("destroy", () => {
      this.input.removeAllListeners();
      this.events.removeAllListeners();
    });

    // Add chatbox DOM element to HUD
    const chatbox = new Chatbox(this); // this.add.dom(10, this.sys.canvas.height - 320).createFromCache("phaserChatbox");
    this.AddObject(chatbox.getDom(), "obj_chatbox");

    // Chatbox event handling
    let isChatFocused = false;
    let isDragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    // --- Block gameplay input when chat is focused ---
    const originalInputEnabled = this.input.enabled;
    this.input.on("gameout", () => {
      if (!isChatFocused) this.input.enabled = originalInputEnabled;
    });
    // Patch pointer/keyboard events to check isChatFocused
    const blockIfChatFocused = (event: any) => {
      if (isChatFocused) {
        event.stopImmediatePropagation && event.stopImmediatePropagation();
        return false;
      }
    };
    this.input.keyboard?.on("keydown", blockIfChatFocused, this);
    this.input.on("pointerdown", blockIfChatFocused, this);
    // --- Chat send logic ---
    // Listen for new chat messages from the server (reuse GameScene event)
    gameScene.AddSceneEvent(PacketType.ByServer.NEW_CHAT_MESSAGE, (data: { message: string, senderId: string }) => {
      chatbox.appendChatMessage(gameScene, data.message, data.senderId);
    });
    // --- Resizable chatbox logic ---


    // --- Add Game Action Panel DOM (bottom right, draggable) ---
    const panelX = this.sys.canvas.width - 10;
    const panelY = this.sys.canvas.height - 260;
    this.leaderboardPanel = new LeaderboardPanel(this);
    this.leaderboardPanel.onPlayerClick((playerId: string) => {
      const player = container.resolve(NetworkManager).getState()?.players.get(playerId);
      if(!player) return;
      const focusManager = container.resolve(CameraFocusManager);
      focusManager.focusOnEntity(gameScene, playerId);
    });
    this.AddObject(this.leaderboardPanel.getDom(), "obj_leaderboard");
    const actionPanel = new GameActionPanel(this);
    
    actionPanel.onSoldierSelect((soldier) => {
      console.log('requested creation of ', soldier);
      networkManager.sendEventToServer(PacketType.ByClient.SOLDIER_CREATE_REQUESTED,
        { soldierType: "SPEARMAN" })
    })

  }

  addButton(
    textureKey: string,
    objectName: string,
    onClick: Function,
    tooltip?: string
  ) {
    const btn = this.AddObject(this.add.image(0, 0, textureKey), objectName)
      .setInteractive()
      .on("pointerover", () => {
        this.GetObject<Phaser.GameObjects.Text>('text_tooltip')?.setText(tooltip || '');
        this.GetObject<Phaser.GameObjects.Text>('text_tooltip')?.setVisible(true);
        this.GetObject<Phaser.GameObjects.Image>(objectName)!.setScale(1.5);
      })
      .on("pointerdown", onClick)
      .on("pointerout", () => {
        this.GetObject<Phaser.GameObjects.Text>("text_tooltip")?.setText("");
        this.GetObject<Phaser.GameObjects.Text>("text_tooltip")?.setVisible(
          false
        );
        this.GetObject<Phaser.GameObjects.Image>(objectName)!.setScale(1);
      });
    return btn;
  }
}
