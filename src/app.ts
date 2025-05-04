import { ctx, canvas } from "./canvas";
import { PLUS_PIXEL, DIAG_PIXEL, REVERSE_DIAG_PIXEL } from "./shapes";
import GIF from "gif.js.optimized/dist/gif";
import gifWorkerUrl from "gif.js.optimized/dist/gif.worker.js?url";

// Constants
const SHAPES = [PLUS_PIXEL, DIAG_PIXEL, REVERSE_DIAG_PIXEL];
// const MAX_PIXELS = 20; // Maximum number of pixels before cleanup
const PIXEL_SPACING = 2; // Minimum distance between pixels
const ANIMATION_FRAME_RATE = 60;
const root = document.querySelector(':root') as HTMLElement | null;
if (!root) {
  console.error("Root not found");
}

// State
let CURRENT_COLOR = "#000000";
const activePixels: WigglePixel[] = [];
let isDrawing = false;
let lastX: number | null = null;
let lastY: number | null = null;
let animationFrameId: number | null = null;
let lastFrameTime = 0;
let CANVAS_BACKGROUND = "#FFFFFF";

// Helpers
function getRandShape() {
  return SHAPES[Math.floor(Math.random() * SHAPES.length)];
}

class WigglePixel {
  x: number;
  y: number;
  color: string;
  frameData: number[][][];
  currentFrame: number;

  constructor(
    x: number,
    y: number,
    color = CURRENT_COLOR,
    frameData: number[][][]
  ) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.frameData = frameData;
    this.currentFrame = 0;
  }

  draw() {
    ctx.fillStyle = this.color;
    this.frameData[this.currentFrame].forEach(([dx, dy]) => {
      ctx.fillRect(this.x + dx, this.y + dy, 1, 1);
    });
  }

  update() {
    this.currentFrame = (this.currentFrame + 1) % this.frameData.length;
  }
}

// Main animation loop
function animate(timestamp: number) {
  if (!lastFrameTime) lastFrameTime = timestamp;
  const deltaTime = timestamp - lastFrameTime;

  if (deltaTime >= ANIMATION_FRAME_RATE) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const pixel of activePixels) {
      pixel.update();
      pixel.draw();
    }

    lastFrameTime = timestamp;
  }

  animationFrameId = requestAnimationFrame(animate);
}

function startAnimation() {
  if (!animationFrameId && activePixels.length > 0) {
    animationFrameId = requestAnimationFrame(animate);
  }
}

function stopAnimation() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

function placePixel(x: number, y: number) {
  // Clean up old pixels if we reach the limit
  // if (activePixels.length >= MAX_PIXELS) {
  //   // activePixels.splice(0, Math.floor(MAX_PIXELS * 0.2)); // Remove 20% oldest
  //   return;
  // }

  const pixel = new WigglePixel(x, y, undefined, getRandShape());
  activePixels.push(pixel);

  // Start animation if not already running
  if (activePixels.length === 1) {
    startAnimation();
  }
}

// Mouse event handlers
canvas.addEventListener("pointerdown", (e) => {
  if (e.button === 2) {
    return;
  }
  e.preventDefault();
  isDrawing = true;
  lastX = e.offsetX;
  lastY = e.offsetY;
  placePixel(lastX, lastY);
});

canvas.addEventListener("pointermove", (e) => {
  if (!isDrawing) return;

  const x = e.offsetX;
  const y = e.offsetY;

  if (lastX === null || lastY === null) {
    lastX = x;
    lastY = y;
    return;
  }

  const dx = x - lastX;
  const dy = y - lastY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.max(1, Math.floor(distance / PIXEL_SPACING));

  for (let i = 1; i <= steps; i++) {
    const ratio = i / steps;
    const px = lastX + dx * ratio;
    const py = lastY + dy * ratio;
    placePixel(px, py);
  }

  lastX = x;
  lastY = y;
});

canvas.addEventListener("pointerup", () => {
  isDrawing = false;
  lastX = null;
  lastY = null;
});

canvas.addEventListener("pointerleave", () => {
  isDrawing = false;
  lastX = null;
  lastY = null;
});

// Clear button
const clearBtn = document.getElementById("clearBtn");
if (clearBtn) {
  clearBtn.addEventListener("click", () => {
    activePixels.length = 0;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stopAnimation();
  });
}


// Outputs JSON for each WigglePixel
const jsonBtn = document.getElementById("jsonBtn");
if (jsonBtn) {
  jsonBtn.addEventListener("click", () => {
    console.log(JSON.stringify(activePixels));
  });
}

// Buttons that change pencil color
const colorButtons = document.querySelectorAll("[data-color]");
colorButtons.forEach((button) => {
  button.addEventListener("click", () => {
    // Remove 'btn-selected' from all buttons
    colorButtons.forEach((btn) => btn.classList.remove("btn-selected"));

    // Set the current color and add 'btn-selected' to the clicked button
    CURRENT_COLOR = button.getAttribute("data-color") || "#000000";
    button.classList.add("btn-selected");
  });
});

// Background color button
const bgColorInput = document.getElementById("bgColorInput");
if (bgColorInput) {
  bgColorInput.addEventListener("change", () => {
    CANVAS_BACKGROUND = (bgColorInput as HTMLInputElement).value || "#FFFFFF";
    root?.style.setProperty('--drawing-background', CANVAS_BACKGROUND);
  })
}



// Save to GIF
async function captureGif(frames = 3, frameDelay = ANIMATION_FRAME_RATE) {
  const gif = new GIF({
    workers: 2,
    quality: 10,
    width: canvas.width,
    height: canvas.height,
    workerScript: gifWorkerUrl,
    background: CANVAS_BACKGROUND,
  });

  const originalDrawing = ctx.fillStyle;
  const originalAnimationState = animationFrameId !== null;
  stopAnimation();

  for (let i = 0; i < frames; i++) {
    ctx.fillStyle = CANVAS_BACKGROUND;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    activePixels.forEach((pixel) => {
      pixel.currentFrame = i % pixel.frameData.length;
      pixel.draw();
    });

    gif.addFrame(canvas, {
      delay: frameDelay,
      copy: true,
    });
  }

  ctx.fillStyle = originalDrawing;

  return new Promise<Blob>((resolve, reject) => {
    gif.on("finished", (blob: Blob) => {
      if (originalAnimationState) {
        startAnimation();
      }
      resolve(blob);
    });

    gif.on("abort", () => reject(new Error("GIF rendering aborted")));
    gif.render();
  });
}

async function handleGifDownload() {
  try {
    const gifBlob = await captureGif();
    const url = URL.createObjectURL(gifBlob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `wigglecanvas-${new Date().toISOString()}.gif`;
    a.click();

    setTimeout(() => URL.revokeObjectURL(url), 100);
  } catch (error) {
    console.error("GIF creation failed :( ", error);
    alert("GIF creation failed :(");
  }
}

const saveGifBtn = document.getElementById("saveGifBtn");
if (saveGifBtn) {
  saveGifBtn.addEventListener("click", () => handleGifDownload());
}


// Favicon
const favicon = document.getElementById("favicon");
if (favicon) {
  setInterval(updateFavicon, ANIMATION_FRAME_RATE);
}

let faviconFrame = 0;

function updateFavicon(): void {
  const linkElement = favicon as HTMLLinkElement | null;
  if (!linkElement) return; 
  linkElement.href = `/src/img/wiggle-icon-${faviconFrame}.png`;
  faviconFrame = (faviconFrame + 1) % 3;
}