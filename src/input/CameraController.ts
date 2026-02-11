import { Camera } from '../rendering/Camera';

export class CameraController {
  private isDragging = false;
  private lastX = 0;
  private lastY = 0;
  private canvas: HTMLCanvasElement;

  constructor(private camera: Camera, canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.setupEvents();
  }

  private setupEvents(): void {
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 1 || e.button === 2 || (e.button === 0 && e.shiftKey)) {
        this.isDragging = true;
        this.lastX = e.clientX;
        this.lastY = e.clientY;
        e.preventDefault();
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        const dx = e.clientX - this.lastX;
        const dy = e.clientY - this.lastY;
        this.camera.pan(dx, dy);
        this.lastX = e.clientX;
        this.lastY = e.clientY;
      }
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.camera.zoomAt(e.clientX, e.clientY, e.deltaY);
    }, { passive: false });

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  get dragging(): boolean {
    return this.isDragging;
  }
}
