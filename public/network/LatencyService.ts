import { singleton } from "tsyringe";
import * as Colyseus from "colyseus.js";

@singleton()
export class LatencyService {
  private pingInterval?: NodeJS.Timeout;
  private lastPing = 0;
  latency = 999;

  start(room: Colyseus.Room) {
    this.stop();
    this.pingInterval = setInterval(() => {
      this.lastPing = Date.now();
      room.send("ping", { timestamp: this.lastPing });
    }, 1000);

    room.onMessage("pong", (data: { timestamp: number }) => {
      this.latency = Date.now() - data.timestamp;
    });
  }

  stop() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.pingInterval = undefined;
  }
}
