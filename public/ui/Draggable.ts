import Phaser from "phaser";

export class Draggable {
  private scene: Phaser.Scene;
  private dom: Phaser.GameObjects.DOMElement;
  private handle: HTMLElement | null;
  private isDragging = false;
  private dragOffsetX = 0;
  private dragOffsetY = 0;

  // 🔥 custom callback
  private onDragCallback: (() => void) | null = null;

  constructor(scene: Phaser.Scene, dom: Phaser.GameObjects.DOMElement, handleSelector?: string) {
    this.scene = scene;
    this.dom = dom;

    this.handle = handleSelector
      ? (dom.node as HTMLElement).querySelector(handleSelector)
      : (dom.node as HTMLElement);

    this.initDrag();
  }

  private initDrag() {
    this.handle?.addEventListener("mousedown", (e) => {
      const mouseEvent = e as MouseEvent;
      this.isDragging = true;
      this.dragOffsetX = mouseEvent.clientX - this.dom.x;
      this.dragOffsetY = mouseEvent.clientY - this.dom.y;
      document.body.style.userSelect = "none";
    });

    window.addEventListener("mousemove", (e: MouseEvent) => {
      if (this.isDragging) {
        this.dom.x = e.clientX - this.dragOffsetX;
        this.dom.y = e.clientY - this.dragOffsetY;
        (this.dom.node as HTMLElement).style.transform = "translate(0,0)";

        // 🔥 notify anyone listening
        if (this.onDragCallback) {
          this.onDragCallback();
        }
      }
    });

    window.addEventListener("mouseup", () => {
      this.isDragging = false;
      document.body.style.userSelect = "";
    });
  }
  onDrag(cb: () => void) {
    this.onDragCallback = cb;
  }
}
