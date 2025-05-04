declare module 'gif.js.optimized/dist/gif' {
    interface GIFOptions {
        workers?: number;
        quality?: number;
        width?: number;
        height?: number;
        workerScript?: string | URL;
        background?: string;
        dither?: boolean;
    }

    class GIF {
        constructor(options: GIFOptions);
        addFrame(
            image: HTMLCanvasElement | CanvasRenderingContext2D | ImageData,
            options?: { delay?: number; copy?: boolean }
        ): void;
        render(): void;
        on(
            event: 'finished',
            callback: (blob: Blob) => void
        ): void;
        on(
            event: 'abort' | 'start',
            callback: () => void
        ): void;
        on(
            event: 'progress',
            callback: (percent: number) => void
        ): void;
    }

    export default GIF;
}

declare module 'gif.js.optimized/dist/gif.worker.js' {
    const url: string;
    export default url;
}