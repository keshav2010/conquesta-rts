import "reflect-metadata";

import { singleton } from "tsyringe";

@singleton()

export class ClientStateManager {
  playerId: any;
  constructor() {
    this.playerId;
  }
}
