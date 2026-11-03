import { useEffect, useState } from 'react';
import { RunDetail } from './RunDetail';
import { RunList } from './RunList';

function parseHash(): { runId: number | null } {
  const match = /^#\/runs\/(\d+)$/.exec(window.location.hash);
  return { runId: match ? Number(match[1]) : null };
}

export function App() {
  const [route, setRoute] = useState(parseHash);

  useEffect(() => {
    const onChange = () => setRoute(parseHash());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return (
    <main>
      <header>
        <h1>
          <a href="#/">Release Quality Dashboard</a>
        </h1>
      </header>
      {route.runId === null ? <RunList /> : <RunDetail id={route.runId} />}
    </main>
  );
}
