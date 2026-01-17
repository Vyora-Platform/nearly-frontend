declare module 'hls.js' {
  export interface HlsConfig {
    maxBufferLength?: number;
    maxMaxBufferLength?: number;
    maxBufferSize?: number;
    maxBufferHole?: number;
    lowLatencyMode?: boolean;
    backBufferLength?: number;
    startLevel?: number;
    progressive?: boolean;
    autoStartLoad?: boolean;
    [key: string]: any;
  }

  export interface Level {
    bitrate: number;
    width: number;
    height: number;
    name: string;
  }

  export interface HlsErrorData {
    type: string;
    details: string;
    fatal: boolean;
    url?: string;
    reason?: string;
    level?: number;
    frag?: any;
  }

  export default class Hls {
    static isSupported(): boolean;
    
    static Events: {
      MANIFEST_PARSED: string;
      ERROR: string;
      BUFFER_APPENDED: string;
      LEVEL_LOADED: string;
      FRAG_LOADED: string;
      [key: string]: string;
    };

    constructor(config?: HlsConfig);
    
    loadSource(url: string): void;
    attachMedia(media: HTMLMediaElement): void;
    detachMedia(): void;
    startLoad(startPosition?: number): void;
    stopLoad(): void;
    destroy(): void;
    
    on(event: string, callback: (...args: any[]) => void): void;
    off(event: string, callback: (...args: any[]) => void): void;
    
    media: HTMLMediaElement | null;
    levels: Level[];
    currentLevel: number;
    nextLevel: number;
    loadLevel: number;
    autoLevelEnabled: boolean;
  }
}
