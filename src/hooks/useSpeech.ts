// Voice support: text-to-speech (read my own schedule aloud) and speech input
// (navigation / dose logging only). Every recognized text is shown for
// confirmation BEFORE anything is saved.

import { useCallback, useEffect, useRef, useState } from 'react';

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

type RecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): RecognitionCtor | null {
  const w = window as unknown as Record<string, RecognitionCtor | undefined>;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechInputSupported(): boolean {
  return getRecognitionCtor() !== null;
}

export function useTts() {
  const [speaking, setSpeaking] = useState(false);

  const speak = useCallback((text: string, onDone?: () => void) => {
    if (!('speechSynthesis' in window)) {
      setSpeaking(false);
      return false;
    }
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 0.95;
      utter.onend = () => {
        setSpeaking(false);
        onDone?.();
      };
      setSpeaking(true);
      window.speechSynthesis.speak(utter);
      return true;
    } catch {
      setSpeaking(false);
      return false;
    }
  }, []);

  const cancel = useCallback(() => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  useEffect(() => cancel, [cancel]);

  return { speak, cancel, speaking, supported: typeof window !== 'undefined' && 'speechSynthesis' in window };
}

interface UseSpeechInputResult {
  listening: boolean;
  transcript: string;
  error: string | null;
  supported: boolean;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

export function useSpeechInput(lang = 'en-IN'): UseSpeechInputResult {
  const recogRef = useRef<SpeechRecognitionLike | null>(null);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const supported = isSpeechInputSupported();

  const stop = useCallback(() => {
    try {
      recogRef.current?.stop();
    } catch {
      /* ignore */
    }
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setError('Speech input is not supported in this browser. Please type instead.');
      return;
    }
    try {
      const r = new Ctor();
      recogRef.current = r;
      r.lang = lang;
      r.continuous = false;
      r.interimResults = true;
      r.onresult = (event) => {
        let text = '';
        for (let i = 0; i < event.results.length; i++) {
          text += event.results[i][0]?.transcript ?? '';
        }
        setTranscript(text);
      };
      r.onerror = (e) => {
        setError(e.error === 'not-allowed' ? 'Microphone permission denied.' : 'Speech input failed. Please type instead.');
        setListening(false);
      };
      r.onend = () => setListening(false);
      setError(null);
      setTranscript('');
      r.start();
      setListening(true);
    } catch {
      setError('Could not start speech input. Please type instead.');
      setListening(false);
    }
  }, [lang]);

  const reset = useCallback(() => {
    setTranscript('');
    setError(null);
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { listening, transcript, error, supported, start, stop, reset };
}
