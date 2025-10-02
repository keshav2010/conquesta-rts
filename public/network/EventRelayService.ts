import { singleton, injectable } from "tsyringe";
import * as Colyseus from "colyseus.js";
import Phaser from "phaser";

@singleton()
export class EventRelayService {
  private room?: Colyseus.Room;
  private game?: Phaser.Game;
  private onMessageHandler?: (type: string | number, message: any) => void;

  /**
   * Start relaying all room messages into Phaser scenes
   */
  start(room: Colyseus.Room, game: Phaser.Game) {
    this.stop(); // cleanup old binding if any
    this.room = room;
    this.game = game;

    this.onMessageHandler = (type: string | number, message: any) => {
      if (typeof type === "string" && this.game) {
        this.game.scene.getScenes(true).forEach((scene) => {
          scene.events.emit(type, message);
        });
      }
    };

    this.room.onMessage("*", this.onMessageHandler as any);
  }

  /**
   * Stop relaying (clean up listeners)
   */
  stop() {
    if (this.room && this.onMessageHandler) {
      this.room.removeAllListeners();
    }
    this.room = undefined;
    this.game = undefined;
    this.onMessageHandler = undefined;
  }
}
