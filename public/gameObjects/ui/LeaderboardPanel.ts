import Phaser from "phaser";
import { Draggable } from "./Draggable";
import { container } from "tsyringe";
import { NetworkManager } from "../../network/NetworkManager";
interface PlayerScore {
  name: string;
  playerId: string;
  score: number;
} 

export default class LeaderboardPanel {
  private dom: Phaser.GameObjects.DOMElement;
  private listContainer: HTMLElement;

  private onPlayerClickHandler: Function | null = null;
  constructor(scene: Phaser.Scene) {
    // Create DOM panel
    this.dom = scene.add
      .dom(scene.sys.canvas.width - 20, 100)
      .createFromCache("leaderboard-panel");

    this.dom.setOrigin(1, 0);
    this.dom.setDepth(10001);
    this.dom.setScrollFactor(0);

    const node = this.dom.node as HTMLElement;

    const leaderboardList = node.querySelector("#leaderboard-list");
    if (!leaderboardList) {
      throw new Error("Leaderboard panel template missing #leaderboard-list");
    }
    this.listContainer = leaderboardList as HTMLElement;

    // Attach draggable
    new Draggable(scene, this.dom, "#leaderboard-drag-handle");
    const initialScore: PlayerScore[] = [];
    for(const entry of container.resolve(NetworkManager).getState()?.players.values()!) {
      initialScore.push({
        score: entry.score,
        name: entry.name,
        playerId: entry.id
      })
    }
  }

  onPlayerClick(cb: (playerId: string) => void) {
    this.onPlayerClickHandler = cb;
  }

  /**
   * Update leaderboard display with styled rows.
   */
  public update(players: PlayerScore[]): void {
    const sorted = [...players].sort((a, b) => b.score - a.score);
    this.listContainer.textContent = "";

    for (let i = 0; i < sorted.length; i++) {
      const p = sorted[i];
      const row = document.createElement("div");
      row.className = "leaderboard-item"; // use styled class

      const rank = document.createElement("span");
      rank.className = "leaderboard-rank";
      rank.textContent = `${i + 1}`;

      const name = document.createElement("span");
      name.className = "leaderboard-name";
      name.textContent = this.escapeHtml(p.name); 

      const score = document.createElement("span");
      score.className = "leaderboard-score";
      score.textContent = this.formatScore(p.score);

      row.appendChild(rank);
      row.appendChild(name);
      row.appendChild(score);

      row.setAttribute('data-player-id', `${p.playerId}`);
      if(this.onPlayerClickHandler)
        row.addEventListener('click', () => {
          this.onPlayerClickHandler!(p.playerId);
        })
      this.listContainer.appendChild(row);
    }
  }

  private formatScore(score: number): string {
    return Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(score);
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  public getDom(): Phaser.GameObjects.DOMElement {
    return this.dom;
  }
}
