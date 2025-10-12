import Phaser from "phaser";
import { Draggable } from "./Draggable";
import { container } from "tsyringe";
import { NetworkManager } from "../../network/NetworkManager";
import CONSTANTS from '../../constant'
export interface SoldierOption {
  key: string;
  name: string;
  cost: number;
  attack: number;
  defense: number;
  icon: string;
}

export default class GameActionPanel {
  private dom: Phaser.GameObjects.DOMElement;
  private scene: Phaser.Scene;

  private soldierPopup: HTMLElement | null = null;
  private onSoldierSelectHandler: ((soldier: SoldierOption) => void) | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // Create panel from cached HTML template
    this.dom = scene.add
      .dom(20, 100)
      .createFromCache("game-action-panel");

    this.dom.setOrigin(0, 0);
    this.dom.setDepth(10001);
    this.dom.setScrollFactor(0);

    const node = this.dom.node as HTMLElement;
    const panelContainer = node.querySelector(".game-action-panel-container") as HTMLElement;

    // Attach draggable
    const draggableBehaviour = new Draggable(scene, this.dom, "#game-action-panel-drag");
    draggableBehaviour.onDrag(() => {
      const btnCreateSoldier = this.getButton("btn-create-soldier");
      btnCreateSoldier && this.repositionSoldierPopup(btnCreateSoldier)
    })

    // Bind buttons
    const btnDisconnect = this.getButton("btn-disconnect");
    const btnCreateFlag = this.getButton("btn-create-flag");
    const btnDeleteSelected = this.getButton("btn-delete-selected");
    const btnCreateSoldier = this.getButton("btn-create-soldier");

    const networkManager = container.resolve(NetworkManager);
    const gameScene = scene.scene.get(CONSTANTS.SCENES.GAME);

    btnDisconnect?.addEventListener("click", () => {
      networkManager.disconnectGameServer();
      scene.scene.stop(CONSTANTS.SCENES.HUD_SCORE);
      scene.scene.start(CONSTANTS.SCENES.MENU);
    });

    btnCreateFlag?.addEventListener("click", () => {
      gameScene.events.emit(CONSTANTS.GAMEEVENTS.CREATE_CAPTURE_FLAG_BUTTON_CLICKED);
    });

    btnDeleteSelected?.addEventListener("click", () => {
      gameScene.events.emit(CONSTANTS.GAMEEVENTS.DELETE_SELECTED_OBJECTS);
    });

    // Soldier popup
    this.soldierPopup = node.querySelector("#soldier-popup") as HTMLElement;
    const closeBtn = this.soldierPopup?.querySelector("#soldier-popup-close") as HTMLElement;
    if (btnCreateSoldier) {
      btnCreateSoldier.addEventListener("click", () => {
        this.openSoldierPopup(btnCreateSoldier);
      });
    }
    if (closeBtn) {
      closeBtn.addEventListener("click", () => this.closeSoldierPopup());
    }

    // Soldier card clicks
    this.soldierPopup?.querySelectorAll(".soldier-card").forEach(card => {
      card.addEventListener("click", () => {
        const option: SoldierOption = {
          key: card.getAttribute("data-soldier") ?? "unknown",
          name: card.querySelector(".soldier-name")?.textContent ?? "???",
          cost: Number(card.getAttribute("data-cost") ?? "0"),
          attack: Number(card.getAttribute("data-atk") ?? "0"),
          defense: Number(card.getAttribute("data-def") ?? "0"),
          icon: (card.querySelector("img") as HTMLImageElement)?.src ?? ""
        };
        if (option.key !== "unknown" && this.onSoldierSelectHandler) {
          this.onSoldierSelectHandler(option);
        }
        this.closeSoldierPopup();
      });
    });

    // Tooltip positioning
    const panelBtns = (panelContainer?.querySelectorAll(".game-action-btn") ?? []) as NodeListOf<HTMLButtonElement>;
    panelBtns.forEach(btn => {
      const tooltip = btn.querySelector(".game-action-tooltip") as HTMLDivElement | null;
      if (!tooltip) return;
      btn.addEventListener("mouseenter", () => {
        tooltip.style.display = "block";
        tooltip.style.left = "";
        tooltip.style.top = "";
        tooltip.style.right = "";
        tooltip.style.bottom = "";

        const btnRect = btn.getBoundingClientRect();
        const tipRect = tooltip.getBoundingClientRect();
        const canvasRect = scene.sys.game.canvas.getBoundingClientRect();

        let left = btn.offsetWidth + 8;
        let top = (btn.offsetHeight - tipRect.height) / 2;

        if (btnRect.left + left + tipRect.width > canvasRect.right) {
          left = -tipRect.width - 8;
        }
        if (btnRect.top + top + tipRect.height > canvasRect.bottom) {
          top = btn.offsetHeight - tipRect.height;
        }
        if (btnRect.top + top < canvasRect.top) {
          top = 0;
        }

        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
      });
      btn.addEventListener("mouseleave", () => {
        tooltip.style.display = "";
      });
    });

    // Cleanup
    scene.events.on("shutdown", () => this.destroy());
    scene.events.on("destroy", () => this.destroy());
  }

  private getButton(id: string): HTMLElement | null {
    return this.dom.getChildByID(id) as HTMLElement | null;
  }
  
  private repositionSoldierPopup(btn: HTMLElement) {
    if (!this.soldierPopup || this.soldierPopup.style.display === "none") return;

    const canvasRect = this.scene.sys.game.canvas.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    const popupRect = this.soldierPopup.getBoundingClientRect();

    // Start position: to the right of the button (relative to panel container)
    let left = btn.offsetLeft + btn.offsetWidth + 8;
    let top = btn.offsetTop;

    // If it overflows to the right of canvas → flip to left side
    if (btnRect.right + popupRect.width > canvasRect.right) {
      left = btn.offsetLeft - popupRect.width - 8;
    }

    // If it overflows bottom of canvas → push it up
    if (btnRect.bottom + popupRect.height > canvasRect.bottom) {
      top = btn.offsetTop - (popupRect.height - btn.offsetHeight);
    }

    // Clamp to top inside the panel
    if (top < 0) {
      top = 0;
    }

    this.soldierPopup.style.left = `${left}px`;
    this.soldierPopup.style.top = `${top}px`;
  }

  private openSoldierPopup(btn: HTMLElement) {
    if (this.soldierPopup) {
      this.soldierPopup.style.display = "block";
      this.repositionSoldierPopup(btn);
    }
  }

  private closeSoldierPopup() {
    if (this.soldierPopup) {
      this.soldierPopup.style.display = "none";
    }
  }

  onSoldierSelect(cb: (soldier: SoldierOption) => void) {
    this.onSoldierSelectHandler = cb;
  }

  getDom(): Phaser.GameObjects.DOMElement {
    return this.dom;
  }

  destroy() {
    this.dom.destroy();
  }
}
