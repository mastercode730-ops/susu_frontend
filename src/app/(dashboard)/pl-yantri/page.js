'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function PLYantriRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const gameID = searchParams.get('GameID') || searchParams.get('GID') || '';
    const selUID = searchParams.get('SelectedUID') || '';
    const date = searchParams.get('Date') || '';
    const rates = searchParams.get('Rates') || '';

    const out = new URLSearchParams({ GameID: gameID });
    if (selUID) out.set('SelectedUID', selUID);
    if (date) out.set('Date', date);
    if (rates) out.set('Rates', rates);
    out.set('mode', 'agent');

    router.replace(`/yantri?${out.toString()}`);
  }, [router, searchParams]);

  return (
    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)' }}>
      Redirecting to Yantri...
    </div>
  );
}

export default function PLYantriPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)' }}>
        Loading Redirect...
      </div>
    }>
      <PLYantriRedirect />
    </Suspense>
  );
}
