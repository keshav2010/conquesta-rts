import CONSTANT from "../constant";
import { BaseScene } from "./BaseScene";
import { PacketType } from "../../common/PacketType";

const { SoldierType } = require("../../common/SoldierType");
import $ from "jquery";
import { GameScene, Textures } from "./GameScene";
import { NetworkManager } from "../network/NetworkManager";
import { PlayerState } from "../../gameserver/schema/PlayerState";
import { Spearman } from "../soldiers/Spearman";
import CONSTANTS from "../constant";
import { CaptureFlag } from "../gameObjects/CaptureFlag";
import { container } from "tsyringe";
import LeaderboardPanel from "../ui/LeaderboardPanel";
import Chatbox from "../ui/Chatbox";

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
    gameScene.AddSceneEvent(PacketType.ByServer.NEW_CHAT_MESSAGE, (data: { message: string, senderName: string }) => {
      chatbox.appendChatMessage(data.message, data.senderName);
    });
    // --- Resizable chatbox logic ---


    // --- Add Game Action Panel DOM (bottom right, draggable) ---
    const panelX = this.sys.canvas.width - 10;
    const panelY = this.sys.canvas.height - 260;
    this.leaderboardPanel = new LeaderboardPanel(this);
    this.leaderboardPanel.onPlayerClick((playerId: string) => {
      const player = container.resolve(NetworkManager).getState()?.players.get(playerId);
      if(!player) return;
      gameScene.getSceneCamera().pan(player?.pos.x, player?.pos.y, 800);
    });
    this.AddObject(this.leaderboardPanel.getDom(), "obj_leaderboard");

    const gameActionPanel = this.add.dom(panelX, panelY).createFromCache("game-action-panel");
    gameActionPanel.setOrigin(1, 0);
    gameActionPanel.setDepth(10000);
    gameActionPanel.setScrollFactor(0);
    this.AddObject(gameActionPanel, "obj_gameActionPanel");

    // Drag logic
    const panelContainer = gameActionPanel.getChildByID("game-action-panel-container");
    const panelDrag = gameActionPanel.getChildByID("game-action-panel-drag");
    let isPanelDragging = false;
    let panelDragOffsetX = 0;
    let panelDragOffsetY = 0;
    let panelMouseMoveListener: ((e: MouseEvent) => void) | null = null;
    let panelMouseUpListener: ((e: MouseEvent) => void) | null = null;
    if (panelDrag && panelContainer) {
      panelDrag.addEventListener("mousedown", (e) => {
        const mouseEvent = e as MouseEvent;
        isPanelDragging = true;
        panelDragOffsetX = mouseEvent.clientX - gameActionPanel.x;
        panelDragOffsetY = mouseEvent.clientY - gameActionPanel.y;
        document.body.style.userSelect = "none";
      });
      panelMouseMoveListener = (e: MouseEvent) => {
        if (isPanelDragging) {
          let newX = Math.max(0, Math.min(this.sys.canvas.width, e.clientX - panelDragOffsetX));
          let newY = Math.max(0, Math.min(this.sys.canvas.height - 60, e.clientY - panelDragOffsetY));
          gameActionPanel.x = newX;
          gameActionPanel.y = newY;
        }
      };
      panelMouseUpListener = () => {
        isPanelDragging = false;
        document.body.style.userSelect = "";
      };
      window.addEventListener("mousemove", panelMouseMoveListener);
      window.addEventListener("mouseup", panelMouseUpListener);
    }
    // Button logic
    const btnDisconnect = gameActionPanel.getChildByID("btn-disconnect")!;
    const btnCreateFlag = gameActionPanel.getChildByID("btn-create-flag")!;
    const btnDeleteSelected = gameActionPanel.getChildByID("btn-delete-selected")!;

    btnDisconnect.addEventListener("click", () => {
      networkManager.disconnectGameServer();
      gameScene.scene.stop(CONSTANT.SCENES.HUD_SCORE);
      gameScene.scene.start(CONSTANT.SCENES.MENU);
    });
    btnCreateFlag.addEventListener("click", (event) => {
      const gameScene = this.scene.get(CONSTANT.SCENES.GAME);
      gameScene.events.emit(CONSTANTS.GAMEEVENTS.CREATE_CAPTURE_FLAG_BUTTON_CLICKED);
    });

    btnDeleteSelected.addEventListener("click", () => {
      gameScene.events.emit(CONSTANTS.GAMEEVENTS.DELETE_SELECTED_OBJECTS);
    });

    // Tooltip positioning logic: ensure tooltips never overflow the visible canvas
    // This runs for all .game-action-btn in the panel
    const panelBtns = (panelContainer?.querySelectorAll('.game-action-btn') ?? []) as NodeListOf<HTMLButtonElement>;
    panelBtns.forEach(btn => {
      const tooltip = btn.querySelector('.game-action-tooltip') as HTMLDivElement | null;
      if (!tooltip) return;
      btn.addEventListener('mouseenter', (e) => {
        // Reset to default position (right of button)
        tooltip.style.left = '';
        tooltip.style.right = '';
        tooltip.style.top = '';
        tooltip.style.bottom = '';
        tooltip.style.transform = '';
        tooltip.style.display = 'block';
        // Get bounding rects
        const btnRect = btn.getBoundingClientRect();
        const tipRect = tooltip.getBoundingClientRect();
        const canvasRect = this.sys.game.canvas.getBoundingClientRect();
        // Default: right of button, vertically centered
        let left = btn.offsetWidth + 8;
        let top = (btn.offsetHeight - tipRect.height) / 2;
        // Check right overflow
        if (btnRect.left + left + tipRect.width > canvasRect.right) {
          left = -tipRect.width - 8;
        }
        // Check bottom overflow
        if (btnRect.top + top + tipRect.height > canvasRect.bottom) {
          top = btn.offsetHeight - tipRect.height;
        }
        // Check top overflow
        if (btnRect.top + top < canvasRect.top) {
          top = 0;
        }
        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
      });
      btn.addEventListener('mouseleave', () => {
        tooltip.style.display = '';
      });
    });
    // Cleanup on shutdown/destroy
    this.events.on("shutdown", () => {
      gameActionPanel.destroy();
      if (panelMouseMoveListener) window.removeEventListener("mousemove", panelMouseMoveListener);
      if (panelMouseUpListener) window.removeEventListener("mouseup", panelMouseUpListener);
    });
    this.events.on("destroy", () => {
      gameActionPanel.destroy();
      if (panelMouseMoveListener) window.removeEventListener("mousemove", panelMouseMoveListener);
      if (panelMouseUpListener) window.removeEventListener("mouseup", panelMouseUpListener);
    });
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
