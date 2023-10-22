'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChatManager, ChatManagerState } from './chat';
import Image from 'next/image';
import '../globals.css';

// 1. VAD triggers silence. (Latency here is frame size + VAD delay)
// 2. ASR sends partial transcript. ASR latency = 2-1.
// 3. ASR sends final transcript. ASR latency = 3-1.
// 4. LLM request is made. This can happen before 3 is complete, in which case the speculative execution savings is 3-2.
// 5. LLM starts streaming tokens. LLM base latency = 5-4.
// 6. LLM sends enough tokens for TTS to start (full sentence, or 50 chars). LLM token latency = 6-5, LLM total latency = 6-4.
// 7. TTS requests chunk of audio.
// 8. TTS chunk is received.
// 9. TTS playout starts (usually just about instantaneous after 8). TTS latency = 9-7.
// Total latency = 9-1 = ASR latency + LLM base latency + LLM token latency TTS latency - speculative execution savings.

// Token per second rules of thumb:
// GPT-4: 12 tps (approx 1s for 50 chars)
// GPT-3.5: 70 tps (approx 0.2s for 50 chars)
// Claude v1: 40 tps (approx 0.4s for 50 chars)
// Claude Instant v1: 70 tps (approx 0.2s for 50 chars)

const DEFAULT_ASR_PROVIDER = 'deepgram';
const DEFAULT_TTS_PROVIDER = 'playht';
const DEFAULT_LLM = 'gpt-4';
const ASR_PROVIDERS = ['aai', 'deepgram', 'gladia', 'revai', 'soniox'];
const TTS_PROVIDERS = [
  'aws',
  'azure',
  'eleven',
  'eleven-ws',
  'gcp',
  'lmnt',
  'lmnt-ws',
  'murf',
  'playht',
  'resemble',
  'wellsaid',
];
const LLM_MODELS = ['claude-2', 'claude-instant-1', 'gpt-4', 'gpt-4-32k', 'gpt-3.5-turbo', 'gpt-3.5-turbo-16k'];
const AGENT_IDS = ['ai-friend', 'dr-donut', 'rubber-duck', 'spanish-tutor'];

const Dropdown: React.FC<{ label: string; param: string; value: string; options: string[] }> = ({
  param,
  label,
  value,
  options,
}) => (
  <>
    <label className="text-xs ml-2 font-bold">{label}</label>
    <select
      value={value}
      onChange={(e) => {
        const params = new URLSearchParams(window.location.search);
        params.set(param, e.target.value);
        window.location.search = params.toString();
      }}
      className="text-xs ml-1 pt-1 pb-1 border rounded"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </>
);

const Visualizer: React.FC<{
  width?: number;
  height?: number;
  state?: ChatManagerState;
  inputAnalyzer?: AnalyserNode;
  outputAnalyzer?: AnalyserNode;
}> = ({ width, height, state, inputAnalyzer, outputAnalyzer }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  if (canvasRef.current) {
    canvasRef.current.width = canvasRef.current.offsetWidth;
    canvasRef.current.height = canvasRef.current.offsetHeight;
  }
  if (inputAnalyzer) {
    inputAnalyzer.fftSize = 64;
    inputAnalyzer.maxDecibels = 0;
    inputAnalyzer.minDecibels = -70;
  }
  if (outputAnalyzer) {
    // We use a larger FFT size for the output analyzer because it's typically fullband,
    // versus the wideband input analyzer, resulting in a similar bin size for each.
    // Then, when we grab the lowest 16 bins from each, we get a similar spectrum.
    outputAnalyzer.fftSize = 256;
    outputAnalyzer.maxDecibels = 0;
    outputAnalyzer.minDecibels = -70;
  }
  const draw = (canvas: HTMLCanvasElement, state: ChatManagerState, freqData: Uint8Array) => {
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    const marginWidth = 2;
    const barWidth = canvas.width / freqData.length - marginWidth * 2;
    const totalWidth = barWidth + marginWidth * 2;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    freqData.forEach((freqVal, i) => {
      const barHeight = (freqVal * canvas.height) / 128;
      const x = barHeight + 25 * (i / freqData.length);
      const y = 250 * (i / freqData.length);
      const z = 50;
      if (state == ChatManagerState.LISTENING) {
        ctx.fillStyle = `rgb(${x},${y},${z})`;
      } else if (state == ChatManagerState.THINKING) {
        ctx.fillStyle = `rgb(${z},${x},${y})`;
      } else if (state == ChatManagerState.SPEAKING) {
        ctx.fillStyle = `rgb(${y},${z},${x})`;
      }
      ctx.fillRect(i * totalWidth + marginWidth, canvas.height - barHeight, barWidth, barHeight);
    });
  };
  const render = useCallback(() => {
    let freqData: Uint8Array = new Uint8Array(0);
    switch (state) {
      case ChatManagerState.LISTENING:
        if (!inputAnalyzer) return;
        freqData = new Uint8Array(inputAnalyzer!.frequencyBinCount);
        inputAnalyzer!.getByteFrequencyData(freqData);
        freqData = freqData.slice(0, 16);
        break;
      case ChatManagerState.THINKING:
        freqData = new Uint8Array(16);
        // make the data have random pulses based on performance.now, which decay over time
        const now = performance.now();
        for (let i = 0; i < freqData.length; i++) {
          freqData[i] = Math.max(0, Math.sin((now + i * 100) / 100) * 128 + 128) / 2;
        }
        break;
      case ChatManagerState.SPEAKING:
        if (!outputAnalyzer) return;
        freqData = new Uint8Array(outputAnalyzer!.frequencyBinCount);
        outputAnalyzer!.getByteFrequencyData(freqData);
        freqData = freqData.slice(0, 16);
        break;
    }
    draw(canvasRef.current!, state ?? ChatManagerState.IDLE, freqData);
    requestAnimationFrame(render);
  }, [state, inputAnalyzer, outputAnalyzer]);
  useEffect(() => render(), [state]);
  let className = '';
  if (!width) className += ' w-full';
  if (!height) className += ' h-full';
  return <canvas className={className} ref={canvasRef} width={width} height={height} />;
};

const Button: React.FC<{ onClick: () => void; disabled: boolean; children: React.ReactNode }> = ({
  onClick,
  disabled,
  children,
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`${
      disabled ? 'bg-gray-300' : 'bg-fixie-charcoal hover:bg-fixie-dark-gray'
    } rounded-md px-4 py-2 text-md font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fixie-fresh-salmon`}
  >
    {children}
  </button>
);

const Latency: React.FC<{ name: string; latency: number }> = ({ name, latency }) => (
  <>
    {' '}
    {name} <span className="font-bold">{latency ? latency.toFixed(0) : '-'}</span> ms
  </>
);

const AgentPageComponent: React.FC = () => {
  const searchParams = useSearchParams();
  const tapOrClick = typeof window != 'undefined' && 'isTouchDevice' in window ? 'Tap' : 'Click';
  const idleText = `${tapOrClick} anywhere to start!`;
  const asrProvider = searchParams.get('asr') || DEFAULT_ASR_PROVIDER;
  const asrLanguage = searchParams.get('asrLanguage') || undefined;
  const ttsProvider = searchParams.get('tts') || DEFAULT_TTS_PROVIDER;
  const ttsVoice = searchParams.get('ttsVoice') || undefined;
  const model = searchParams.get('llm') || DEFAULT_LLM;
  const agentId = searchParams.get('agent') || 'dr-donut';
  const docs = searchParams.get('docs') !== null;
  const showChooser = searchParams.get('chooser') !== null;
  const showInput = searchParams.get('input') !== null;
  const showOutput = searchParams.get('output') !== null;
  const showStats = searchParams.get('stats') !== null;
  const [chatManager, setChatManager] = useState<ChatManager | null>(null);
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [helpText, setHelpText] = useState(idleText);
  const [asrLatency, setAsrLatency] = useState(0);
  const [llmLatency, setLlmLatency] = useState(0);
  const [ttsLatency, setTtsLatency] = useState(0);
  const active = () => Boolean(chatManager) && chatManager!.state != ChatManagerState.IDLE;
  const handleStart = () => {
    const manager = new ChatManager({ asrProvider, asrLanguage, ttsProvider, ttsVoice, model, agentId, docs });
    setInput('');
    setOutput('');
    setAsrLatency(0);
    setLlmLatency(0);
    setTtsLatency(0);
    setChatManager(manager);
    manager.start('');
    manager.onStateChange = (state) => {
      console.log(`state=${state}`);
      switch (state) {
        case ChatManagerState.LISTENING:
          setHelpText('Listening...');
          break;
        case ChatManagerState.THINKING:
          setHelpText(`Thinking... ${tapOrClick.toLowerCase()} to cancel`);
          break;
        case ChatManagerState.SPEAKING:
          setHelpText(`Speaking... ${tapOrClick.toLowerCase()} to interrupt`);
          break;
        default:
          setHelpText(idleText);
      }
    };
    manager.onInputChange = (text, final, latency) => {
      setInput(text);
      if (latency) {
        setAsrLatency(latency);
      }
      setLlmLatency(0);
      setTtsLatency(0);
    };
    manager.onOutputChange = (text, final, latency) => {
      setOutput(text);
      if (final) {
        setInput('');
      }
      setLlmLatency((prev) => (prev ? prev : latency));
    };
    manager.onAudioStart = (latency) => {
      setTtsLatency(latency);
    };
    manager.onError = () => {
      chatManager!.stop();
      setChatManager(null);
    };
  };
  const handleStop = () => {
    if (!chatManager) {
      return;
    }
    chatManager!.stop();
    setChatManager(null);
  };
  const speak = () => (chatManager ? chatManager.interrupt() : handleStart());
  // Click/tap starts or interrupts.
  const onClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (!target.matches('button')) {
      speak();
    }
  };
  // Spacebar starts or interrupts. Esc quits.
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.keyCode == 32) {
      speak();
      event.preventDefault();
    } else if (event.keyCode == 27) {
      handleStop();
      event.preventDefault();
    }
  };
  // Install our handlers, and clean them up on unmount.
  useEffect(() => {
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('click', onClick);
    };
  }, [onKeyDown]);
  return (
    <>
      {showChooser && (
        <div className="absolute top-1 right-1">
          <Dropdown label="Agent" param="agent" value={agentId} options={AGENT_IDS} />
          <Dropdown label="ASR" param="asr" value={asrProvider} options={ASR_PROVIDERS} />
          <Dropdown label="LLM" param="llm" value={model} options={LLM_MODELS} />
          <Dropdown label="TTS" param="tts" value={ttsProvider} options={TTS_PROVIDERS} />
        </div>
      )}
      <div className="w-full flex flex-col items-center justify-center text-center">
        <div>
          <Image src="/voice-logo.svg" alt="Fixie Voice" width={322} height={98} priority={true} />
        </div>
        <div className="flex justify-center p-4">
          <Image priority={true} width="512" height="512" src={`/agents/${agentId}.webp`} alt={agentId} />
        </div>
        <div>
          {showOutput && (
            <div className="m-2 w-full text-md py-8 px-2 rounded-lg border-2 bg-fixie-light-dust">{output}</div>
          )}
        </div>
        <div>
          {showInput && (
            <div
              className={`m-2 w-full text-md h-12 rounded-lg border-2 bg-fixie-light-dust ${
                active() ? 'border-red-400' : ''
              }`}
            >
              {input}
            </div>
          )}
        </div>
        <p className="py-4 text-xl">{helpText}</p>
        <div className="w-full max-w-lg p-4">
          <Visualizer
            height={64}
            state={chatManager?.state}
            inputAnalyzer={chatManager?.inputAnalyzer}
            outputAnalyzer={chatManager?.outputAnalyzer}
          />
        </div>
        <div className="w-full flex justify-center mt-3">
          {active() && (
            <Button disabled={false} onClick={handleStop}>
              End Chat
            </Button>
          )}
        </div>
        {showStats && (
          <div className="flex justify-center">
            <span className="text-sm font-mono">
              <Latency name="ASR" latency={asrLatency} /> |
              <Latency name="LLM" latency={llmLatency} /> |
              <Latency name="TTS" latency={ttsLatency} /> |
              <Latency name="" latency={asrLatency + llmLatency + ttsLatency} />
            </span>
          </div>
        )}
      </div>
    </>
  );
};

export default AgentPageComponent;
