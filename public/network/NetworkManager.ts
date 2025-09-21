import { container, inject, injectable, singleton } from "tsyringe";

import * as Colyseus from "colyseus.js";
import Phaser from "phaser";
import { SessionState } from "../../gameserver/schema/SessionState";
import { ITiled2DMap } from '../../common/ITiled2DMap';

const URL = `${window.document.location.host.replace(/:.*/, '')}`;
import axios from 'axios';
import { LatencyService } from "./LatencyService";
import { MapService } from "./MapService";
import { EventRelayService } from "./EventRelayService";
import { PlayerIdentityService } from "./PlayerIdentity";
export type RoomEventHandlerCallbackType = (
  type: "onStateChange" | "onMessage" | "onLeave" | "onError",
  data: any
) => void;

export enum NetworkErrorCode {
  MAP_NOT_FOUND = "MAP_NOT_FOUND",
  ERROR_DURING_ROOM_DISCONNECT = "ERROR_DURING_ROOM_DISCONNECT",
  FAILED_TO_HOST_SESSION = "FAILED_TO_HOST_SESSION",

}
export class NetworkError extends Error {
  errorCode: NetworkErrorCode;
  constructor(errorCode: NetworkErrorCode, message: string) {
    super(message);
    this.errorCode = errorCode;
  }
}

@singleton()
@injectable()
export class NetworkManager {
  client: Colyseus.Client;
  room: Colyseus.Room<SessionState> | null;
  game: Phaser.Game;
  scene: Phaser.Scenes.SceneManager;
  registry: Phaser.Data.DataManager;
  playerName: string | null;
  eventHandlersBinded: boolean;

  // the JSON stringified data for scene map (tiled2D json format)
  private mapData: ITiled2DMap | null = null;
  lastPingTimestamp: number = 0;

  constructor(
    @inject("PhaserGame") private phaserGame: Phaser.Game,
    @inject("PhaserRegistry") private phaserRegistry: Phaser.Data.DataManager,
    @inject(MapService) private mapService: MapService,
    @inject(LatencyService) public latencyService : LatencyService,
    @inject(EventRelayService) private eventRelay: EventRelayService,
    @inject(PlayerIdentityService) public identityService: PlayerIdentityService,
  ) {
    const endpoint = `${location.protocol.replace("http", "ws")}//${URL}${location.port ? ':' + location.port : ''}`
    this.client = new Colyseus.Client(endpoint);
    this.room = null;

    this.game = phaserGame;
    this.scene = phaserGame.scene;

    this.registry = phaserRegistry;
    this.playerName = null;
    this.eventHandlersBinded = false;
  }

  getState() {
    return this.room?.state;
  }
  getClientId() {
    return this.room?.sessionId;
  }
  setupRoomListener() {
    if (!this.room) {
      return;
    }

    this.latencyService.start(this.room);
    this.eventRelay.start(this.room, this.game);

    this.room.onLeave((code) => {
      console.log(`Leaving Room ${this.room?.name}, code: ${code}`);
      this.teardownRoom();
    });

    this.room.onError((code, message) => {
      console.log("[room / onError] :", { code, message });
    });
  }


  async joinRoomById(roomId: string) {
    const room = await this.client.joinById<SessionState>(roomId, {
      playerName: this.identityService.getPlayerName(),
    });
    this.room = room;
    localStorage.setItem("colyseus:reconnectionToken", this.room.reconnectionToken);
    this.setupRoomListener();
    return room;
  }

  isSocketConnected() {
    return this.room != null && this.room.connection?.isOpen;
  }

  async disconnectGameServer() {
    try {
      this.teardownRoom();
    } catch (error) {
      throw new NetworkError(
        NetworkErrorCode.ERROR_DURING_ROOM_DISCONNECT,
        "Encountered error while trying to disconnect."
      );
    }
  }

  getMapData() {
    if(!this.room)
      return null;
    return this.mapService.getMapData(this.room);
  }
  
  sendEventToServer<T = any>(eventType: string, data: T) {
    this.room?.send(eventType, data);
  }
  async getAvailableSession(roomName?: string) {
    let rooms = await this.client.getAvailableRooms(roomName);
    return rooms;
  }
  async hostAndJoinSession(sessionName: string, roomOptions: {
    minPlayers: number,
    maxPlayers: number,
    spawnSelectionTimer: number
  }) {
    try {

      // disconnect from any existing server.
      await this.disconnectGameServer().catch(err => {
        console.log(err);
      });

      // ref newly launched room
      this.room = await this.client.create("session_room", {
        name: sessionName,
        playerName: this.identityService.getPlayerName(),
        minPlayers: roomOptions.minPlayers,
        maxPlayers: roomOptions.maxPlayers,
        spawnSelectionTimer: roomOptions.spawnSelectionTimer
      });
      localStorage.setItem("colyseus:reconnectionToken", this.room.reconnectionToken);
      this.setupRoomListener();
    } catch (err) {
      console.error(err);
      throw new NetworkError(
        NetworkErrorCode.FAILED_TO_HOST_SESSION,
        "Failed to host a new session"
      )
    }
  }

  private teardownRoom() {
    this.latencyService.stop();
    this.eventRelay.stop();
    localStorage.removeItem("colyseus:reconnectionToken");
    if (this.room) {
      // Safely remove all listeners to avoid leaks
      this.room.removeAllListeners();

      try {
        this.room.leave(); // optional safeguard, in case not called yet
      } catch (err) {
        console.warn("[teardownRoom] error during leave:", err);
      }
    }

    this.mapService.clearCache();
    this.room = null;
    this.eventHandlersBinded = false;
  }
}
