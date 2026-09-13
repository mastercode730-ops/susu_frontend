'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API } from '../../../utils/api';
import { PageHeader } from '../../../components/layout/PageHeader';
import { AccessRightsManager } from '../../../components/admin/AccessRightsManager';

export default function AccessRightsPage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const r = await API.get('/sapi/auth/me');
        if (r && r.user && r.user.SubUID) {
          router.push('/home');
        }
      } catch (e) {
        console.error(e);
        router.push('/login');
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Role Access Rights & Feature Control"
        description="Configure feature flags and menu access for sub-user staff accounts."
      />
      <AccessRightsManager />
    </div>
  );
}
