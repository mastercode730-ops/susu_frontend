'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Shield, UserCheck } from 'lucide-react';
import { API } from '../../../utils/api';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Tabs } from '../../../components/ui/tabs';
import { SubUsersManager } from '../../../components/admin/SubUsersManager';
import { AccessRightsManager } from '../../../components/admin/AccessRightsManager';
import { AssignClientsManager } from '../../../components/admin/AssignClientsManager';

const TABS = [
  { id: 'subusers', label: 'Sub Users', icon: <Users className="h-4 w-4" /> },
  { id: 'access-rights', label: 'Access Rights', icon: <Shield className="h-4 w-4" /> },
  { id: 'assign-clients', label: 'Assign Customers', icon: <UserCheck className="h-4 w-4" /> },
];

export default function StaffManagementPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('subusers');

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
        title="Sub User Management"
        description="Manage sub-user accounts, their feature access rights, and assigned customers — all in one place."
      />

      <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} className="w-fit" />

      {activeTab === 'subusers' && <SubUsersManager />}
      {activeTab === 'access-rights' && <AccessRightsManager />}
      {activeTab === 'assign-clients' && <AssignClientsManager />}
    </div>
  );
}
