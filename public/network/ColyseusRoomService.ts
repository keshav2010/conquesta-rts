import { singleton } from "tsyringe";
import * as Colyseus from "colyseus.js";
import { SessionState } from "../../gameserver/schema/SessionState";

@singleton()
export class ColyseusRoomService {
  private client: Colyseus.Client;
  private room: Colyseus.Room<SessionState> | null = null;

  constructor() {
    const endpoint = `${location.protocol.replace("http", "ws")}//${location.host}`;
    this.client = new Colyseus.Client(endpoint);
  }

  async joinRoomById(roomId: string, options: any) {
    this.room = await this.client.joinById<SessionState>(roomId, options);
    return this.room;
  }

  async createRoom(name: string, options: any) {
    this.room = await this.client.create<SessionState>(name, options);
    return this.room;
  }

  getRoom() {
    return this.room;
  }

  async leaveRoom() {
    if (this.room) {
      try {
        await this.room.leave();
      } catch (e) {
        console.warn("[RoomService] leave error:", e);
      }
      this.room.removeAllListeners();
      this.room = null;
    }
  }
}
