'use client';

import React from 'react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { SubUsersManager } from '../../../components/admin/SubUsersManager';

export default function SubusersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Sub-Users & Staff Accounts"
        description="Manage staff members, create login credentials, and configure access permissions."
      />
      <SubUsersManager />
    </div>
  );
}
