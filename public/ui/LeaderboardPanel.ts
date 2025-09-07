import Phaser from "phaser";
import { Draggable } from "./Draggable";

export default class LeaderboardPanel {
  private dom: Phaser.GameObjects.DOMElement;
  private listContainer: HTMLElement;

  constructor(scene: Phaser.Scene) {
    this.dom = scene.add.dom(scene.sys.canvas.width - 20, 100).createFromCache("leaderboard-panel");
    this.dom.setOrigin(1, 0);
    this.dom.setDepth(10001);
    this.dom.setScrollFactor(0);

    const node = this.dom.node as HTMLElement;
    this.listContainer = node.querySelector("#leaderboard-list") as HTMLElement;

    // Attach draggable behavior
    new Draggable(scene, this.dom, "#leaderboard-drag-handle");
  }

  public update(players: { name: string; score: number }[]) {
    const sorted = players.sort((a, b) => b.score - a.score);
    this.listContainer.innerHTML = "";
    sorted.forEach((p, i) => {
      const row = document.createElement("div");
      row.className = "leaderboard-row";
      row.innerHTML = `
        <span class="rank">${i + 1}.</span>
        <span class="player">${p.name}</span>
        <span class="score">${p.score}</span>
      `;
      this.listContainer.appendChild(row);
    });
  }

  public getDom(): Phaser.GameObjects.DOMElement {
    return this.dom;
  }
}
