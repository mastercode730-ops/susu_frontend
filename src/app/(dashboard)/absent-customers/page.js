'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserX, Search } from 'lucide-react';
import { API } from '../../../utils/api';
import { showToast } from '../../../utils/toast';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, StatCard } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { Button } from '../../../components/ui/button';
import { DataTable } from '../../../components/tables/DataTable';

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

export default function AbsentCustomersPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [games, setGames] = useState([]);
  const [selectedGameId, setSelectedGameId] = useState('');
  const [absentList, setAbsentList] = useState([]);

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
        await Promise.all([loadGames(), fetchLatestDate()]);
      }
    } catch (e) {
      console.error(e);
      router.push('/login');
    }
  };

  const loadGames = async () => {
    try {
      const r = await API.get('/sapi/game');
      if (r && r.data) {
        setGames(r.data);
        if (r.data.length > 0) {
          setSelectedGameId(r.data[0].GID);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLatestDate = async () => {
    try {
      const r = await API.get('/sapi/hisab/latest-date');
      const today = new Date().toISOString().split('T')[0];
      if (r && r.success && r.data) {
        const parts = r.data.split('/');
        if (parts.length === 3) {
          const months = {Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'};
          setSelectedDate(`${parts[2]}-${months[parts[1]] || '01'}-${parts[0].padStart(2, '0')}`);
          return;
        }
      }
      setSelectedDate(today);
    } catch (e) {
      setSelectedDate(new Date().toISOString().split('T')[0]);
    }
  };

  const handleSearch = async () => {
    if (!selectedDate || !selectedGameId) {
      showToast('Select Date and Game first', 'error');
      return;
    }

    setLoading(true);
    setAbsentList([]);

    const apiDate = toApiDate(selectedDate);
    try {
      const r = await API.get(`/sapi/home/absent-customers?date=${encodeURIComponent(apiDate)}&gameID=${selectedGameId}`);
      if (r && r.success) {
        setAbsentList(r.data || []);
      } else {
        showToast(r?.message || 'Error searching absent customers', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Error searching absent customers', 'error');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      header: 'SRNo',
      id: 'srno',
      cell: ({ row }) => <span className="text-xs font-semibold">{row.index + 1}</span>,
    },
    {
      header: 'Customer Name',
      accessorKey: 'CustomerName',
      cell: ({ row }) => (
        <span className="font-bold text-xs capitalize text-slate-900 dark:text-white">
          {row.original.CustomerName || '-'}
        </span>
      ),
    },
    {
      header: 'Mobile Number',
      accessorKey: 'Mobile',
      cell: ({ row }) => <span className="text-xs font-mono text-slate-600 dark:text-slate-300">{row.original.Mobile || '-'}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Absent Customers Monitor"
        description="Audit inactive customers who have not placed bets for a selected draw date."
      />

      <StatCard
        title="Total Absent Customers"
        value={absentList.length}
        icon={UserX}
        description="Inactive client count for draw"
        className="max-w-xs"
      />

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <Input label="Draw Date" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
            <Select label="Game" value={selectedGameId} onChange={(e) => setSelectedGameId(e.target.value)}>
              <option value="">All Games</option>
              {games.map((g) => (
                <option key={g.GID} value={g.GID}>
                  {g.GameName}
                </option>
              ))}
            </Select>
            <Button onClick={handleSearch} isLoading={loading} leftIcon={<Search className="h-4 w-4" />}>
              SEARCH ABSENT
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Absent Customers Directory ({absentList.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={absentList}
            isLoading={loading}
            searchPlaceholder="Search customer or mobile..."
          />
        </CardContent>
      </Card>
    </div>
  );
}
