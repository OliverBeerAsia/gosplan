import { Camera } from '../rendering/Camera';

const DRAG_THRESHOLD = 3;
const CAMERA_PAN_SPEED = 400; // px/s before zoom scaling

export class CameraController {
  private isDragging = false;
  private lastX = 0;
  private lastY = 0;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragExceededThreshold = false;
  private canvas: HTMLCanvasElement;

  // WASD key tracking
  private keysHeld = new Set<string>();

  constructor(private camera: Camera, canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.setupEvents();
  }

  private setupEvents(): void {
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 1 || e.button === 2 || (e.button === 0 && e.shiftKey)) {
        this.isDragging = true;
        this.dragExceededThreshold = false;
        this.lastX = e.clientX;
        this.lastY = e.clientY;
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        e.preventDefault();
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        // Check drag threshold before considering it a real drag
        if (!this.dragExceededThreshold) {
          const dist = Math.abs(e.clientX - this.dragStartX) + Math.abs(e.clientY - this.dragStartY);
          if (dist < DRAG_THRESHOLD) return;
          this.dragExceededThreshold = true;
        }

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

    // WASD + Arrow key tracking
    window.addEventListener('keydown', (e) => {
      // Don't capture when ctrl/meta held (avoid conflict with shortcuts)
      if (e.ctrlKey || e.metaKey) return;
      this.keysHeld.add(e.key.toLowerCase());
    });

    window.addEventListener('keyup', (e) => {
      this.keysHeld.delete(e.key.toLowerCase());
    });
  }

  update(dt: number): void {
    let dx = 0;
    let dy = 0;

    if (this.keysHeld.has('w') || this.keysHeld.has('arrowup')) dy += 1;
    if (this.keysHeld.has('s') || this.keysHeld.has('arrowdown')) dy -= 1;
    if (this.keysHeld.has('a') || this.keysHeld.has('arrowleft')) dx += 1;
    if (this.keysHeld.has('d') || this.keysHeld.has('arrowright')) dx -= 1;

    if (dx !== 0 || dy !== 0) {
      const speed = CAMERA_PAN_SPEED * (dt / 1000) / this.camera.zoom;
      this.camera.pan(dx * speed, dy * speed);
    }
  }

  get dragging(): boolean {
    return this.isDragging && this.dragExceededThreshold;
  }
}
