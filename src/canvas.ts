const getCanvas = (): HTMLCanvasElement => {
  const canvas = document.getElementById("drawing");
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error("Canvas element not found or invalid");
  }
  return canvas;
};

const initContext = (canvas: HTMLCanvasElement): CanvasRenderingContext2D => {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error(
      "Failed to get 2D context - browser may not support Canvas"
    );
  }
  return ctx;
};

export const canvas = getCanvas();
export const ctx = initContext(canvas);
export const { width, height } = canvas;
