import { singleton } from "tsyringe";
import axios from "axios";
import * as Colyseus from "colyseus.js";
import { NetworkError, NetworkErrorCode } from "./NetworkManager";
import { ITiled2DMap } from "../../common/ITiled2DMap";

@singleton()
export class MapService {
  private mapData: ITiled2DMap | null = null;
  private convertTo2DArray(
    data: number[],
    width: number,
    height: number
  ): number[][] | null {
    if (width * height !== data.length) {
      return null;
    }
    const result: number[][] = [];
    let index = 0;
    for (let i = 0; i < height; i++) {
      const row = data.slice(index, index + width);
      result.push(row);
      index += width;
    }
    return result;
  }

  async fetchRoomMap(room: Colyseus.Room) {
    try {
      const res = await axios({
        method: "GET",
        url: "/maps",
        params: {
          id: room.state.mapId || "",
        },
      });
      if (res.status === 200 || res.status === 304) {
        this.mapData = res.data.data;
        return;
      }
      throw new NetworkError(NetworkErrorCode.MAP_NOT_FOUND, "Failed to find map.");
    } catch (error) {
      this.mapData = null;
      throw error;
    }
  }
  clearCache() {
    this.mapData = null;
  }
  getMapData(room: Colyseus.Room) {
    return this.convertTo2DArray(
      room.state.tilemap.tilemap1D.toArray(),
      room.state.tilemap.tilemapWidth,
      room.state.tilemap.tilemapHeight
    );
  }
}
