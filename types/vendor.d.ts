/** Minimal typings for the parts of untyped third-party modules this project uses. */

declare module "libheif-js/libheif-wasm/libheif-bundle.mjs" {
  export interface HeifImage {
    get_width(): number;
    get_height(): number;
    is_primary(): boolean;
    has_alpha_channel(): boolean;
    display(target: ImageData, callback: (result: ImageData | null) => void): void;
    free(): void;
  }
  export interface HeifDecoder {
    decode(data: Uint8Array): HeifImage[];
  }
  export interface LibHeif {
    HeifDecoder: new () => HeifDecoder;
  }
  /** Creates the libheif module; the WebAssembly binary is embedded in this file. */
  export default function createLibheif(options?: Record<string, unknown>): LibHeif;
}

declare module "imagetracerjs" {
  export interface TracerColor {
    r: number;
    g: number;
    b: number;
    a: number;
  }
  export interface TracerSegment {
    type: "L" | "Q";
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    x3?: number;
    y3?: number;
  }
  export interface TracerPath {
    segments: TracerSegment[];
    boundingbox: [number, number, number, number];
    holechildren: number[];
    isholepath: boolean;
  }
  export interface TraceData {
    layers: TracerPath[][];
    palette: TracerColor[];
    width: number;
    height: number;
  }
  export interface TracerOptions {
    ltres?: number;
    qtres?: number;
    pathomit?: number;
    rightangleenhance?: boolean;
    colorsampling?: 0 | 1 | 2;
    numberofcolors?: number;
    mincolorratio?: number;
    colorquantcycles?: number;
    layering?: 0 | 1;
    strokewidth?: number;
    linefilter?: boolean;
    scale?: number;
    roundcoords?: number;
    viewbox?: boolean;
    desc?: boolean;
    blurradius?: number;
    blurdelta?: number;
    pal?: TracerColor[];
  }
  interface ImageTracer {
    imagedataToTracedata(imgd: { width: number; height: number; data: Uint8ClampedArray }, options?: TracerOptions): TraceData;
    svgpathstring(tracedata: TraceData, layer: number, path: number, options: TracerOptions): string;
    checkoptions(options?: TracerOptions): TracerOptions;
  }
  const tracer: ImageTracer;
  export default tracer;
}
