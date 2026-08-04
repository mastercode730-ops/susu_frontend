'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Save, RotateCcw, UserPlus } from 'lucide-react';
import { API } from '../../../utils/api';
import { showToast } from '../../../utils/toast';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { Checkbox } from '../../../components/ui/checkbox';
import { Button } from '../../../components/ui/button';
import { DataTable } from '../../../components/tables/DataTable';
import { StatusBadge } from '../../../components/ui/badge';

export default function AccessRightsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [subusers, setSubusers] = useState([]);
  const [selectedSubUserId, setSelectedSubUserId] = useState('');

  const [permissions, setPermissions] = useState({
    ADDContacts: false,
    ADDGames: false,
    Result: false,
    Hisab: false,
    HisabSummary: false,
    DateWiseHisab: false,
    Accounts: false,
    ShowAllAccounts: false,
    Balance: false,
    LC: false,
    Yantri: false,
  });

  const [summaryList, setSummaryList] = useState([]);

  useEffect(() => {
    fetchSessionUser();
  }, []);

  const fetchSessionUser = async () => {
    try {
      const r = await API.get('/sapi/auth/me');
      if (r && r.user) {
        if (r.user.SubUID) {
          router.push('/home');
          return;
        }
        await Promise.all([loadSubUsersList(), loadAccessSummary()]);
      }
    } catch (e) {
      console.error(e);
      router.push('/login');
    }
  };

  const loadSubUsersList = async () => {
    setLoading(true);
    try {
      const r = await API.get('/sapi/admin/subusers');
      if (r && r.success) {
        setSubusers(r.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadAccessSummary = async () => {
    try {
      const r = await API.get('/sapi/admin/access-rights');
      if (r && r.success) {
        setSummaryList(r.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUserChange = async (uid) => {
    setSelectedSubUserId(uid);
    if (!uid) {
      handleResetPermissions();
      return;
    }

    try {
      const r = await API.get(`/sapi/admin/access-rights/${uid}`);
      if (r && r.success && r.data) {
        const ar = r.data;
        setPermissions({
          ADDContacts: ar.ADDContacts === true || ar.ADDContacts === 'True',
          ADDGames: ar.ADDGames === true || ar.ADDGames === 'True',
          Result: ar.Result === true || ar.Result === 'True',
          Hisab: ar.Hisab === true || ar.Hisab === 'True',
          HisabSummary: ar.HisabSummary === true || ar.HisabSummary === 'True',
          DateWiseHisab: ar.DateWiseHisab === true || ar.DateWiseHisab === 'True',
          Accounts: ar.Accounts === true || ar.Accounts === 'True',
          ShowAllAccounts: ar.ShowAllAccounts === true || ar.ShowAllAccounts === 'True',
          Balance: ar.Balance === true || ar.Balance === 'True',
          LC: ar.LC === true || ar.LC === 'True',
          Yantri: ar.Yantri === true || ar.Yantri === 'True',
        });
      } else {
        handleResetPermissions();
      }
    } catch (e) {
      console.error(e);
      handleResetPermissions();
    }
  };

  const handleCheckboxChange = (field) => {
    setPermissions((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleResetPermissions = () => {
    setPermissions({
      ADDContacts: false,
      ADDGames: false,
      Result: false,
      Hisab: false,
      HisabSummary: false,
      DateWiseHisab: false,
      Accounts: false,
      ShowAllAccounts: false,
      Balance: false,
      LC: false,
      Yantri: false,
    });
  };

  const handleSaveAccessRights = async () => {
    if (!selectedSubUserId) {
      showToast('Select a user first', 'error');
      return;
    }

    const payload = {
      subUserID: selectedSubUserId,
      addContacts: permissions.ADDContacts,
      addGames: permissions.ADDGames,
      result: permissions.Result,
      hisab: permissions.Hisab,
      hisabSummary: permissions.HisabSummary,
      dateWiseHisab: permissions.DateWiseHisab,
      accounts: permissions.Accounts,
      showAllAccounts: permissions.ShowAllAccounts,
      balance: permissions.Balance,
      lc: permissions.LC,
      yantri: permissions.Yantri,
    };

    try {
      const r = await API.post('/sapi/admin/access-rights', payload);
      if (r && r.success) {
        showToast('Access rights saved successfully!');
        await loadAccessSummary();
      } else {
        showToast(r?.message || 'Error saving access rights', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Error saving access rights', 'error');
    }
  };

  const columns = [
    {
      header: 'Staff Name',
      accessorKey: 'StaffName',
      cell: ({ row }) => <span className="font-bold text-xs capitalize text-slate-900 dark:text-white">{row.original.StaffName || row.original.ARfSatffID}</span>,
    },
    {
      header: 'Contacts',
      accessorKey: 'ADDContacts',
      cell: ({ row }) => <StatusBadge status={row.original.ADDContacts ? 'active' : 'inactive'} customText={row.original.ADDContacts ? 'Yes' : 'No'} />,
    },
    {
      header: 'Games',
      accessorKey: 'ADDGames',
      cell: ({ row }) => <StatusBadge status={row.original.ADDGames ? 'active' : 'inactive'} customText={row.original.ADDGames ? 'Yes' : 'No'} />,
    },
    {
      header: 'Hisab',
      accessorKey: 'Hisab',
      cell: ({ row }) => <StatusBadge status={row.original.Hisab ? 'active' : 'inactive'} customText={row.original.Hisab ? 'Yes' : 'No'} />,
    },
    {
      header: 'Accounts',
      accessorKey: 'Accounts',
      cell: ({ row }) => <StatusBadge status={row.original.Accounts ? 'active' : 'inactive'} customText={row.original.Accounts ? 'Yes' : 'No'} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Role Access Rights & Feature Control"
        description="Configure feature flags and menu access for sub-user staff accounts."
      />

      <Card>
        <CardHeader>
          <CardTitle>Configure Access Permissions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Select label="Select Staff User" value={selectedSubUserId} onChange={(e) => handleUserChange(e.target.value)} className="max-w-md">
            <option value="">Choose Staff User...</option>
            {subusers.map((u) => (
              <option key={u.SubUserID} value={u.SubUserID}>
                {u.subusername} ({u.Mobile})
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
            {[
              { id: 'contacts', label: 'Contacts', field: 'ADDContacts' },
              { id: 'games', label: 'Games', field: 'ADDGames' },
              { id: 'result', label: 'Result', field: 'Result' },
              { id: 'hisab', label: 'Hisab', field: 'Hisab' },
              { id: 'hisabsummary', label: 'Hisab Summary', field: 'HisabSummary' },
              { id: 'accounts', label: 'Accounts', field: 'Accounts' },
              { id: 'showallaccounts', label: 'Show All Accounts', field: 'ShowAllAccounts' },
              { id: 'balance', label: 'Balance', field: 'Balance' },
              { id: 'lc', label: 'LC', field: 'LC' },
              { id: 'yantri', label: 'Yantri', field: 'Yantri' },
            ].map((p) => (
              <Checkbox
                key={p.id}
                label={p.label}
                checked={permissions[p.field]}
                onChange={() => handleCheckboxChange(p.field)}
              />
            ))}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleSaveAccessRights} leftIcon={<Save className="h-4 w-4" />}>
              SAVE RIGHTS
            </Button>
            <Button variant="outline" onClick={handleResetPermissions} leftIcon={<RotateCcw className="h-4 w-4" />}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Staff Access Rights Matrix ({summaryList.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={summaryList} isLoading={loading} searchPlaceholder="Search matrix..." />
        </CardContent>
      </Card>
    </div>
  );
}
