import { singleton } from "tsyringe";
import { v4 as uuidv4 } from "uuid";

export interface PlayerIdentity {
  id: string;       // permanent unique ID
  name: string;     // display name
  createdAt: number;
  lastSeen: number;
}

@singleton()
export class PlayerIdentityService {
  private readonly STORAGE_KEY = "player_identity";
  private identity: PlayerIdentity;

  constructor() {
    this.identity = this.loadIdentity();
  }

  private loadIdentity(): PlayerIdentity {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (raw) {
      const parsed: PlayerIdentity = JSON.parse(raw);
      parsed.lastSeen = Date.now();
      this.saveIdentity(parsed);
      return parsed;
    }

    // Create new identity
    const newIdentity: PlayerIdentity = {
      id: uuidv4(),
      name: `Guest-${Math.floor(Math.random() * 10000)}`,
      createdAt: Date.now(),
      lastSeen: Date.now(),
    };
    this.saveIdentity(newIdentity);
    return newIdentity;
  }

  private saveIdentity(identity: PlayerIdentity) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(identity));
    this.identity = identity;
  }

  getIdentity(): PlayerIdentity {
    return this.identity;
  }

  getPlayerId(): string {
    return this.identity.id;
  }

  getPlayerName(): string {
    return this.identity.name;
  }

  setPlayerName(name: string) {
    this.identity.name = name.trim().replace(/\s+/g, "-");
    this.saveIdentity(this.identity);
  }
}
