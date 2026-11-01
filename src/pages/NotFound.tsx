import { Link } from 'react-router-dom';
import { Button } from '../components/ui';

export function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
      <p className="text-4xl" aria-hidden="true">🧭</p>
      <h1 className="text-2xl font-bold text-slate-800">Page not found</h1>
      <Link to="/">
        <Button>Back to home</Button>
      </Link>
    </div>
  );
}
