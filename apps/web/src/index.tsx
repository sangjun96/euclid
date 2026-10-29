import type { HealthResponse } from '@euclid/contracts';
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

function getHealthLabel(health: HealthResponse | null) {
  if (!health) return '확인 중';
  if (health.status === 'ok') return '연결됨';
  return '연결되지 않음';
}

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((response) => response.json())
      .then(setHealth)
      .catch(() =>
        setHealth({ status: 'unavailable', database: 'unavailable' }),
      );
  }, []);

  return (
    <main>
      <p className="eyebrow">EUCLID</p>
      <h1>실험을 위한 공간</h1>
      <p>파이프라인과 평가 기능을 만들어 갈 준비가 되었습니다.</p>
      <div className="status">
        API / 데이터베이스 <strong>{getHealthLabel(health)}</strong>
      </div>
    </main>
  );
}

const root = document.getElementById('root');
if (!root) {
  throw new Error('Root element not found');
}
createRoot(root).render(<App />);
