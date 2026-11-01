import { useState } from 'react';
import { Button } from './ui';

export function AssistantWidget() {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);

  const handleAsk = () => {
    if (!query.trim()) return;
    setAnswer(
      'This assistant can explain how to use the app and read back your own schedule. It does not give medical advice, change medicines, or advise about missed or extra doses.',
    );
  };

  return (
    <div className="rounded-xl border border-primary-200 bg-primary-50 p-4">
      <h3 className="text-base font-semibold text-primary-800">App assistant</h3>
      <p className="mt-1 text-sm text-slate-600">
        Type a question about the app. I can help with navigation and your own schedule summary.
      </p>
      <div className="mt-3 flex gap-2">
        <input
          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-800 placeholder:text-slate-400 focus:border-primary-600 min-h-[44px]"
          placeholder="Ask something..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button onClick={handleAsk} disabled={!query.trim()}>
          Ask
        </Button>
      </div>
      {answer && (
        <div className="mt-3 rounded-lg bg-white p-3 text-sm text-slate-700">
          <p className="font-semibold text-primary-700">Safety note</p>
          <p>{answer}</p>
        </div>
      )}
    </div>
  );
}
