import { singleton } from "tsyringe";

@singleton()
export class PlayerIdentity {
  private playerName: string | null = null;

  setName(name: string) {
    this.playerName = name.trim().replace(/\s+/g, "-");
  }

  getName() {
    if (!this.playerName) {
      this.playerName = `RandomPlayer${Math.floor(Math.random() * 1000)}`;
    }
    return this.playerName;
  }
}
