'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet, Search, Users } from 'lucide-react';
import { API } from '../../../utils/api';
import { showToast } from '../../../utils/toast';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, StatCard } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { DataTable } from '../../../components/tables/DataTable';
import { formatCurrency } from '../../../lib/utils';

function toApiDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const day = String(d.getDate()).padStart(2, '0');
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export default function StaffBalancePage() {
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [staffData, setStaffData] = useState([]);
  const [totalBalance, setTotalBalance] = useState(0);

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

        const today = new Date().toISOString().split('T')[0];
        setSelectedDate(today);
        loadStaffGrid(today);
      }
    } catch (e) {
      console.error(e);
      router.push('/login');
    }
  };

  const loadStaffGrid = async (dateVal) => {
    setLoading(true);
    setStaffData([]);
    setTotalBalance(0);

    const apiDate = toApiDate(dateVal);
    try {
      const r = await API.get(`/sapi/balance/staff-grid?date=${encodeURIComponent(apiDate)}`);
      if (r && r.success) {
        const sorted = (r.data || []).sort((a, b) => (a.subusername || '').localeCompare(b.subusername || ''));
        setStaffData(sorted);
        setTotalBalance(r.totalBalance || 0);
      }
    } catch (e) {
      console.error(e);
      showToast('Error loading sub user balances', 'error');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      header: 'Sub User',
      accessorKey: 'subusername',
      cell: ({ row }) => (
        <button
          onClick={() => router.push(`/accounts?SUID=${row.original.SubUserID}`)}
          className="font-bold text-xs text-blue-600 hover:underline capitalize"
        >
          {row.original.subusername || row.original.SubUserID}
        </button>
      ),
    },
    {
      header: 'Staff ID',
      accessorKey: 'SubUserID',
      cell: ({ row }) => <span className="text-xs font-mono">{row.original.SubUserID}</span>,
    },
    {
      header: 'Net Balance',
      accessorKey: 'Balance',
      cell: ({ row }) => {
        const b = parseFloat(row.original.Balance) || 0;
        return <span className={`font-bold text-xs ${b < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{formatCurrency(b)}</span>;
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sub-User Staff Balance Sheet"
        description="Monitor current net balance position and ledger totals across sub-user staff accounts."
      />

      <StatCard
        title="Total Staff Outstanding Balance"
        value={formatCurrency(totalBalance)}
        icon={Users}
        description="Aggregated net staff balances"
        className="max-w-md"
      />

      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-auto" />
          <Button onClick={() => loadStaffGrid(selectedDate)} isLoading={loading} leftIcon={<Search className="h-4 w-4" />}>
            Find Balances
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Staff Accounts List ({staffData.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={staffData}
            isLoading={loading}
            searchPlaceholder="Filter sub-user..."
          />
        </CardContent>
      </Card>
    </div>
  );
}
