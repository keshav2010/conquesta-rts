import { singleton } from "tsyringe";
import * as Colyseus from "colyseus.js";
import { PacketType } from "../../common/PacketType";

@singleton()
export class LatencyService {
  private pingInterval?: NodeJS.Timeout;
  private lastPing = 0;
  private room?: Colyseus.Room;
  latency = 999;

  cb: Function | null = null;
  
  onLatencyChange(cb : Function) {
    this.cb = cb;
  }
  start(room: Colyseus.Room) {
    this.stop(); // cleanup any old state

    this.room = room;
    this.pingInterval = setInterval(() => {
      this.lastPing = Date.now();
      this.room?.send(PacketType.ByClient.PING_REQUESTED, { timestamp: this.lastPing });
    }, 1000);

    // Bind handler once per start
    this.room.onMessage(PacketType.ByServer.PONG_RESPONSE, this.onPong);
  }

  private onPong = (data: { timestamp: number }) => {
    const rtt = Date.now() - data.timestamp;
    // Optionally smooth (moving average over last 5 samples)
    this.latency = Math.floor(this.latency === 999 ? rtt : (this.latency + rtt) / 2);
    this.cb && this.cb(this.latency);
  };

  stop() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = undefined;
    }

    if(this.cb)
      this.cb = null;

    if (this.room) {
      this.room.removeAllListeners();
      this.room = undefined;
    }

    this.latency = 999;
  }
}
