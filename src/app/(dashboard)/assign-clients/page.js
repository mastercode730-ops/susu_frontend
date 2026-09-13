'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API } from '../../../utils/api';
import { PageHeader } from '../../../components/layout/PageHeader';
import { AssignClientsManager } from '../../../components/admin/AssignClientsManager';

export default function AssignClientsPage() {
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
        title="Assign Customer Access to Staff"
        description="Grant or revoke customer visibility and management permissions for sub-user staff members."
      />
      <AssignClientsManager />
    </div>
  );
}
