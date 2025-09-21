import { injectable } from "tsyringe";
import { container } from "tsyringe";
import { NetworkManager } from "../network/NetworkManager";
import Phaser from "phaser";

@injectable()
export class CameraFocusManager {
    private networkManager: NetworkManager;

    constructor() {
        this.networkManager = container.resolve(NetworkManager);
    }

    public focusOnEntity(scene: Phaser.Scene, entityId: string, duration: number = 500) {
        const entity = this.networkManager.getState()?.players.get(entityId);

        if (!entity) {
            console.warn(`Entity with id ${entityId} not found`);
            return;
        }

        const camera = scene.cameras.main;
        camera.pan(entity.pos.x, entity.pos.y, duration, "Power2");
        camera.zoomTo(1.5, duration);
    }

    public focusOnCoords(scene: Phaser.Scene, x: number, y: number, duration: number = 500) {
        const camera = scene.cameras.main;
        camera.pan(x, y, duration, "Power2");
    }
}
