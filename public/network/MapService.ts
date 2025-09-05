import { singleton } from "tsyringe";
import axios from "axios";
import { NetworkError, NetworkErrorCode } from "./NetworkManager";
import { ITiled2DMap } from "../../common/ITiled2DMap";

@singleton()
export class MapService {
  private mapData: ITiled2DMap | null = null;

  async fetchMap(mapId: string) {
    try {
      const res = await axios.get("/maps", { params: { id: mapId } });
      if (res.status === 200 || res.status === 304) {
        this.mapData = res.data.data;
        return this.mapData;
      }
      throw new NetworkError(NetworkErrorCode.MAP_NOT_FOUND, "Failed to fetch map");
    } catch (err) {
      this.mapData = null;
      throw err;
    }
  }

  convertTo2DArray(data: number[], width: number, height: number) {
    if (width * height !== data.length) return null;
    const result: number[][] = [];
    for (let i = 0; i < height; i++) {
      result.push(data.slice(i * width, (i + 1) * width));
    }
    return result;
  }
}
