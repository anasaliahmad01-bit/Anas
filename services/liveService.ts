
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { SYSTEM_INSTRUCTION } from '../utils/constants';

const API_KEY = process.env.API_KEY || '';

// Audio Configuration
const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;

class LiveService {
  private ai: GoogleGenAI;
  private session: any = null;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private nextStartTime = 0;
  private onStatusChange: ((status: string) => void) | null = null;
  private activeSources: Set<AudioBufferSourceNode> = new Set();
  private processorNode: ScriptProcessorNode | null = null;
  private isMuted: boolean = false;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: API_KEY });
  }

  // --- Audio Utils (Encoding/Decoding) ---

  private floatTo16BitPCM(input: Float32Array): Int16Array {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return output;
  }

  private base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  // --- Live Session Management ---

  async connect(
    voice: 'male' | 'female', 
    onStatusChange: (status: string) => void
  ) {
    this.onStatusChange = onStatusChange;
    this.updateStatus('connecting');
    this.isMuted = false;

    // Voice Selection Mapping
    // 'Fenrir' is deep/male, 'Kore' is clear/female
    const voiceName = voice === 'male' ? 'Fenrir' : 'Kore';

    try {
      // 1. Setup Audio Contexts
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: INPUT_SAMPLE_RATE
      });
      this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: OUTPUT_SAMPLE_RATE
      });

      // 2. Request Mic Permissions
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // 3. Connect to Gemini Live
      const sessionPromise = this.ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName } }
          },
          // Enhance system instruction for voice context
          systemInstruction: SYSTEM_INSTRUCTION + "\nIMPORTANT: You are in a real-time voice call. Keep responses concise, natural, and conversational in Sorani Kurdish. If the user sends TEXT input, read it and respond to it via Audio."
        },
        callbacks: {
          onopen: () => {
            this.updateStatus('connected');
            this.startInputStreaming(sessionPromise);
          },
          onmessage: async (msg: LiveServerMessage) => {
            // Handle Audio Output
            const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              this.updateStatus('speaking');
              await this.playAudioChunk(base64Audio);
            }
            
            // Handle Interruption (User spoke while AI was speaking)
            if (msg.serverContent?.interrupted) {
              this.stopAllAudio();
              this.updateStatus('listening');
            }

            // If turn complete, go back to listening
            if (msg.serverContent?.turnComplete) {
               this.updateStatus('listening');
            }
          },
          onclose: () => {
            this.updateStatus('disconnected');
            this.disconnect();
          },
          onerror: (err) => {
            console.error("Live API Error:", err);
            this.updateStatus('error');
          }
        }
      });
      
      this.session = sessionPromise;

    } catch (err) {
      console.error("Failed to connect:", err);
      this.updateStatus('error');
      this.disconnect();
      throw err;
    }
  }

  setMute(mute: boolean) {
    this.isMuted = mute;
  }

  async sendText(text: string) {
    if (this.session) {
      const s = await this.session;
      // Send text message to the model (in the same session)
      // The model will process this text and respond via the configured output modality (Audio)
      try {
        s.send({
          clientContent: {
            turns: [{ role: 'user', parts: [{ text }] }],
            turnComplete: true
          }
        });
      } catch (e) {
        console.error("Failed to send text in live session", e);
      }
    }
  }

  private startInputStreaming(sessionPromise: Promise<any>) {
    if (!this.inputAudioContext || !this.mediaStream) return;

    const source = this.inputAudioContext.createMediaStreamSource(this.mediaStream);
    // Buffer size 4096 is a good balance for 16kHz
    this.processorNode = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

    this.processorNode.onaudioprocess = (e) => {
      if (this.isMuted) return; // Drop audio frames if muted

      const inputData = e.inputBuffer.getChannelData(0);
      
      // Convert Float32 to Int16 PCM
      const pcmData = this.floatTo16BitPCM(inputData);
      
      // Create Base64 string from PCM
      const base64Str = this.arrayBufferToBase64(pcmData.buffer);

      // Send to Gemini
      sessionPromise.then(session => {
        session.sendRealtimeInput({
          media: {
            mimeType: 'audio/pcm;rate=16000',
            data: base64Str
          }
        });
      });
    };

    source.connect(this.processorNode);
    this.processorNode.connect(this.inputAudioContext.destination);
  }

  private async playAudioChunk(base64Audio: string) {
    if (!this.outputAudioContext) return;

    const audioBytes = this.base64ToUint8Array(base64Audio);
    
    // Decode manual PCM (16-bit, 24kHz, mono) -> AudioBuffer
    // Gemini Live output is raw PCM, NO header
    const audioBuffer = this.pcmToAudioBuffer(audioBytes, this.outputAudioContext);

    const source = this.outputAudioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.outputAudioContext.destination);
    
    // Schedule seamless playback
    const currentTime = this.outputAudioContext.currentTime;
    // If next start time is in the past, reset to now
    if (this.nextStartTime < currentTime) {
      this.nextStartTime = currentTime;
    }
    
    source.start(this.nextStartTime);
    this.nextStartTime += audioBuffer.duration;
    
    source.onended = () => {
      this.activeSources.delete(source);
      if (this.activeSources.size === 0) {
        // Just a heuristic, real status update comes from 'turnComplete' usually
      }
    };
    
    this.activeSources.add(source);
  }

  private pcmToAudioBuffer(bytes: Uint8Array, ctx: AudioContext): AudioBuffer {
    const sampleRate = OUTPUT_SAMPLE_RATE;
    const numChannels = 1;
    const frameCount = bytes.length / 2; // 16-bit = 2 bytes per sample

    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    const channelData = buffer.getChannelData(0);
    const dataView = new DataView(bytes.buffer);

    for (let i = 0; i < frameCount; i++) {
      // Little-endian 16-bit PCM to Float32 (-1.0 to 1.0)
      const int16 = dataView.getInt16(i * 2, true); 
      channelData[i] = int16 / 32768.0;
    }

    return buffer;
  }

  private stopAllAudio() {
    this.activeSources.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    this.activeSources.clear();
    this.nextStartTime = 0;
  }

  disconnect() {
    this.stopAllAudio();
    
    // Close Audio Contexts
    this.inputAudioContext?.close();
    this.outputAudioContext?.close();
    this.inputAudioContext = null;
    this.outputAudioContext = null;

    // Stop Mic
    this.mediaStream?.getTracks().forEach(track => track.stop());
    this.mediaStream = null;

    // Stop Processor
    this.processorNode?.disconnect();
    this.processorNode = null;

    // Close Session (no explicit close method on promise, but we rely on GC and 'onclose')
    // Ideally use session.close() if resolved
    if (this.session) {
      this.session.then((s: any) => {
        try { s.close(); } catch(e) {}
      });
      this.session = null;
    }
    
    this.onStatusChange = null;
  }

  private updateStatus(status: string) {
    if (this.onStatusChange) {
      this.onStatusChange(status);
    }
  }
}

export const liveClient = new LiveService();
