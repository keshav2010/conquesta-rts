import "reflect-metadata";

import { singleton } from "tsyringe";
import { BaseSoldier } from "./soldiers/BaseSoldier";

@singleton()

export class ClientStateManager {
  playerId: any;
  constructor() {
    this.playerId;
  }
}
