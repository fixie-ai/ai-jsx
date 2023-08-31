'use client';

export class TextToSpeech {
  audio: HTMLAudioElement;
  provider: string;
  voice: string;
  rate: number;
  latency: number;
  constructor(provider: string, voice: string, rate: number = 1.0) {
    if (typeof Audio === 'function') {
      this.audio = new Audio();
      this.audio.onplay = () => {
        console.log('play');
      };
      this.audio.onloadstart = () => {
        console.log('load start');
      };
      this.audio.onloadedmetadata = () => {
        console.log('loaded metadata');
      };
      this.audio.onloadeddata = () => {
        console.log('loaded data');
      };
      this.audio.oncanplay = () => {
        console.log('can play');
      };
      this.audio.onplaying = () => {
        console.log('playing');
      };
    }
    this.provider = provider;
    this.voice = voice;
    this.rate = rate;
    this.latency = 0;
  }
  async play(text: string) {
    const startTime = performance.now();
    this.audio.src = `/tts/api?provider=${this.provider}&voice=${this.voice}&rate=${this.rate}&text=${text}`;
    await this.audio.play();
    this.latency = Math.floor(performance.now() - startTime);
    console.log(`tts latency: ${this.latency} ms`);
  }
  stop() {
    this.audio.pause();
  }
}
