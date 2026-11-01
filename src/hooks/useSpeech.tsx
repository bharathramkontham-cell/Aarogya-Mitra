import { useState, useCallback } from 'react';

interface SpeechState {
  available: boolean;
  speaking: boolean;
  error: string | null;
}

export function useSpeech() {
  const [state, setState] = useState<SpeechState>({
    available: typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined',
    speaking: false,
    error: null,
  });

  const speak = useCallback((text: string) => {
    if (!state.available) {
      setState((s) => ({ ...s, error: 'Speech not available in this browser.' }));
      return;
    }
    try {
      const utterance = new window.SpeechSynthesisUtterance(text);
      utterance.onstart = () => setState((s) => ({ ...s, speaking: true, error: null }));
      utterance.onend = () => setState((s) => ({ ...s, speaking: false }));
      utterance.onerror = () => setState((s) => ({ ...s, speaking: false, error: 'Speech failed.' }));
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      setState((s) => ({ ...s, error: String(err) }));
    }
  }, [state.available]);

  const cancel = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setState((s) => ({ ...s, speaking: false }));
  }, []);

  return { ...state, speak, cancel };
}
