declare module 'vue-wave-visualizer' {
  import { DefineComponent } from 'vue';
  
  export const WaveVisualizer: DefineComponent<{
    stream: MediaStream | null;
    mode?: 'waveform' | 'bars' | 'circular' | 'mirror-bars';
    height?: number;
    color?: string;
    backgroundColor?: string;
    barCount?: number;
    lineWidth?: number;
    fftSize?: number;
    smoothingTimeConstant?: number;
    silenceThreshold?: number;
    silenceDuration?: number;
  }>;
}