import Phaser from "phaser";

export class Resizable {
    private scene: Phaser.Scene;
    private dom: Phaser.GameObjects.DOMElement;
    private handleSelector: string;
    private minW: number;
    private maxW: number;
    private minH: number;
    private maxH: number;

    constructor(
        scene: Phaser.Scene,
        dom: Phaser.GameObjects.DOMElement,
        handleSelector: string,
        options?: {
            minW?: number;
            maxW?: number;
            minH?: number;
            maxH?: number;
        }
    ) {
        this.scene = scene;
        this.dom = dom;
        this.handleSelector = handleSelector;

        this.minW = options?.minW ?? 200;
        this.maxW = options?.maxW ?? 800;
        this.minH = options?.minH ?? 100;
        this.maxH = options?.maxH ?? 600;

        this.attach();
    }

    private attach() {
        const handle = this.dom.node.querySelector(this.handleSelector) as HTMLElement | null;
        const container = this.dom.node as HTMLElement;
        if (!handle || !container) return;

        let resizing = false;
        let startX = 0, startY = 0, startW = 0, startH = 0;

        handle.addEventListener("mousedown", (e: MouseEvent) => {
            resizing = true;
            startX = e.clientX;
            startY = e.clientY;
            startW = container.offsetWidth;
            startH = container.offsetHeight;
            document.body.style.userSelect = "none";
            e.preventDefault();
            e.stopPropagation();
        });

        window.addEventListener("mousemove", (e: MouseEvent) => {
            if (!resizing) return;

            const newW = Math.max(this.minW, Math.min(this.maxW, startW + (e.clientX - startX)));
            const newH = Math.max(this.minH, Math.min(this.maxH, startH + (e.clientY - startY)));

            container.style.width = newW + "px";
            container.style.height = newH + "px";

            // Optional: trigger a resize event so caller can adjust internals
            container.dispatchEvent(new CustomEvent("resized", { detail: { width: newW, height: newH } }));
        });

        window.addEventListener("mouseup", () => {
            resizing = false;
            document.body.style.userSelect = "";
        });
    }
}
