import Phaser from "phaser";

export class Draggable {
  private scene: Phaser.Scene;
  private dom: Phaser.GameObjects.DOMElement;
  private handle: HTMLElement | null;
  private isDragging = false;
  private dragOffsetX = 0;
  private dragOffsetY = 0;

  constructor(scene: Phaser.Scene, dom: Phaser.GameObjects.DOMElement, handleSelector?: string) {
    this.scene = scene;
    this.dom = dom;

    // If selector is provided, restrict drag to that handle
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
        // reset CSS transform so Phaser controls actual positioning
        (this.dom.node as HTMLElement).style.transform = "translate(0,0)";
      }
    });

    window.addEventListener("mouseup", () => {
      this.isDragging = false;
      document.body.style.userSelect = "";
    });
  }
}
