'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { Wallet, Search, Download, Plus, ArrowUpRight, Scale, CheckCircle2 } from 'lucide-react';
import { API } from '../../../utils/api';
import { showToast } from '../../../utils/toast';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, StatCard } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { Button } from '../../../components/ui/button';
import { DataTable } from '../../../components/tables/DataTable';
import { Dialog } from '../../../components/ui/dialog';
import { LoadingSpinner } from '../../../components/ui/spinner';
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

function toInputDate(apiDate) {
  if (!apiDate) return '';
  const months = {Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'};
  const parts = apiDate.split('/');
  if (parts.length === 3) {
    const month = months[parts[1]] || '01';
    const day = parts[0].padStart(2, '0');
    return `${parts[2]}-${month}-${day}`;
  }
  return apiDate;
}

export default function BalancePage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState(null);
  const [isStaff, setIsStaff] = useState(false);

  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(false);

  const [gameBalList, setGameBalList] = useState([]);
  const [uttarBalList, setUttarBalList] = useState([]);
  const [myBalList, setMyBalList] = useState([]);
  const [staffList, setStaffList] = useState([]);

  const [gameBalTotals, setGameBalTotals] = useState({ open: 0, today: 0, bal: 0 });
  const [uttarBalTotals, setUttarBalTotals] = useState({ open: 0, today: 0, bal: 0 });
  const [myBalTotals, setMyBalTotals] = useState({ open: 0, today: 0, bal: 0 });
  const [staffTotalBal, setStaffTotalBal] = useState(0);

  const [showHistModal, setShowHistModal] = useState(false);
  const [histTitle, setHistTitle] = useState('Balance History');
  const [histRows, setHistRows] = useState([]);
  const [histLoading, setHistLoading] = useState(false);
  const [histParams, setHistParams] = useState({ uid: '', mobile: '', mode: '', type: 'all', from: '', to: '' });

  const [showTxnModal, setShowTxnModal] = useState(false);
  const [txnParams, setTxnParams] = useState({ cid: '', name: '', amount: '', type: 'Paid' });
  const [txnLoading, setTxnLoading] = useState(false);

  useEffect(() => {
    fetchSessionUser();
  }, []);

  const fetchSessionUser = async () => {
    try {
      const r = await API.get('/sapi/auth/me');
      if (r && r.user) {
        setCurrentUser(r.user);
        const sub = !!r.user.SubUID;
        setIsStaff(sub);

        const today = new Date().toISOString().split('T')[0];
        const twoYearsAgo = new Date();
        twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
        const defaultFrom = twoYearsAgo.toISOString().split('T')[0];

        setHistParams((prev) => ({ ...prev, from: defaultFrom, to: today }));

        const dr = await API.get('/sapi/balance/latest-date');
        const apiDateVal = dr && dr.success && dr.date ? dr.date : toApiDate(today);
        const inputD = toInputDate(apiDateVal);
        setSelectedDate(inputD);

        loadBalanceGrids(apiDateVal, sub);
      }
    } catch (e) {
      console.error(e);
      router.push('/login');
    }
  };

  const loadBalanceGrids = async (apiDate, subSession) => {
    setLoading(true);

    try {
      const endpoints = [
        API.get(`/sapi/balance/my-balance?date=${encodeURIComponent(apiDate)}&filter=`),
        API.get(`/sapi/balance/game-balance?date=${encodeURIComponent(apiDate)}&filter=`),
        API.get(`/sapi/balance/uttar-balance?date=${encodeURIComponent(apiDate)}&filter=`),
      ];

      if (!subSession) {
        endpoints.push(API.get(`/sapi/balance/staff-grid?date=${encodeURIComponent(apiDate)}`));
      }

      const results = await Promise.all(endpoints);
      const r1 = results[0];
      const r2 = results[1];
      const r3 = results[2];
      const r4 = results[3];

      const myBalData = r1 && r1.success ? r1.data || [] : [];
      setMyBalList(myBalData);
      setMyBalTotals({
        open: Math.trunc(myBalData.reduce((s, r) => s + (parseFloat(r.Opening) || 0), 0)),
        today: Math.trunc(myBalData.reduce((s, r) => s + (parseFloat(r.Today) || 0), 0)),
        bal: Math.trunc(myBalData.reduce((s, r) => s + (parseFloat(r.WinAmount) || 0), 0)),
      });

      const gameBalData = r2 && r2.success ? r2.data || [] : [];
      setGameBalList(gameBalData);
      setGameBalTotals({
        open: Math.trunc(gameBalData.reduce((s, r) => s + (parseFloat(r.Opening) || 0), 0)),
        today: Math.trunc(gameBalData.reduce((s, r) => s + (parseFloat(r.Today) || 0), 0)),
        bal: Math.trunc(gameBalData.reduce((s, r) => s + (parseFloat(r.WinAmount) || 0), 0)),
      });

      const uttarBalData = r3 && r3.success ? r3.data || [] : [];
      setUttarBalList(uttarBalData);
      setUttarBalTotals({
        open: Math.trunc(uttarBalData.reduce((s, r) => s + (parseFloat(r.Opening) || 0), 0)),
        today: Math.trunc(uttarBalData.reduce((s, r) => s + (parseFloat(r.Today) || 0), 0)),
        bal: Math.trunc(uttarBalData.reduce((s, r) => s + (parseFloat(r.WinAmount) || 0), 0)),
      });

      if (!subSession && r4 && r4.success) {
        const staffData = r4.data || [];
        setStaffList(staffData);
        setStaffTotalBal(parseFloat(r4.totalBalance) || 0);
      }
    } catch (e) {
      console.error(e);
      showToast('Error loading balance reports', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    const apiD = toApiDate(selectedDate);
    loadBalanceGrids(apiD, isStaff);
  };

  const handleOpenHistModal = async (row, mode) => {
    setHistLoading(true);
    setShowHistModal(true);
    setHistRows([]);

    const activeParams = {
      uid: row.UID,
      mobile: row.CMobile || row.UID,
      mode,
      type: 'all',
      from: histParams.from,
      to: histParams.to,
    };
    setHistParams(activeParams);
    setHistTitle(`${activeParams.mobile} Balance History`);

    await loadHistoryLogs(activeParams);
  };

  const loadHistoryLogs = async (params) => {
    setHistLoading(true);
    setHistRows([]);

    const ep =
      params.mode === '1'
        ? `/sapi/balance/game-balance-history?customerUID=${params.uid}&type=${params.type}&fromDate=${params.from}&toDate=${params.to}`
        : `/sapi/balance/my-balance-history?customerUID=${params.uid}&type=${params.type}&fromDate=${params.from}&toDate=${params.to}`;

    try {
      const r = await API.get(ep);
      if (r && r.success) {
        setHistRows(r.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setHistLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (!gameBalList.length && !uttarBalList.length && !staffList.length && !myBalList.length) {
      showToast('No data to export!', 'error');
      return;
    }
    const wb = XLSX.utils.book_new();
    const rows = [['SRNo', 'Customer', 'Opening', 'Today', 'Balance']];
    gameBalList.forEach((r, i) =>
      rows.push([i + 1, r.CMobile || r.UID, parseFloat(r.Opening) || 0, parseFloat(r.Today) || 0, parseFloat(r.WinAmount) || 0])
    );
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Game Balance');
    XLSX.writeFile(wb, `Balance_${selectedDate}.xlsx`);
    showToast('Exported successfully!');
  };

  const gameColumns = [
    {
      header: 'Customer',
      accessorKey: 'CMobile',
      cell: ({ row }) => (
        <button
          onClick={() => handleOpenHistModal(row.original, '1')}
          className="font-bold text-xs text-blue-600 hover:underline"
        >
          {row.original.CMobile || row.original.UID}
        </button>
      ),
    },
    {
      header: 'Opening',
      accessorKey: 'Opening',
      cell: ({ row }) => <span className="text-xs font-mono">{formatCurrency(parseFloat(row.original.Opening) || 0)}</span>,
    },
    {
      header: 'Today',
      accessorKey: 'Today',
      cell: ({ row }) => <span className="text-xs font-mono">{formatCurrency(parseFloat(row.original.Today) || 0)}</span>,
    },
    {
      header: 'Net Balance',
      accessorKey: 'WinAmount',
      cell: ({ row }) => {
        const bal = parseFloat(row.original.WinAmount) || 0;
        return <span className={`font-bold text-xs ${bal < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{formatCurrency(bal)}</span>;
      },
    },
    ...(isStaff
      ? [
          {
            header: 'Add Entry',
            id: 'add',
            cell: ({ row }) => (
              <Button
                size="sm"
                variant="success"
                onClick={() => {
                  setTxnParams({ cid: row.original.CID, name: row.original.CMobile || row.original.UID, amount: '', type: 'Paid' });
                  setShowTxnModal(true);
                }}
              >
                + ADD
              </Button>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer & Staff Balance Ledger"
        description="Opening balances, daily turnover, settlement amounts, and staff balance sheets."
        actions={
          <Button variant="outline" onClick={handleExportExcel} leftIcon={<Download className="h-4 w-4" />}>
            Export Excel
          </Button>
        }
      />

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Game Balance Total" value={formatCurrency(gameBalTotals.bal)} icon={Wallet} description="Live game ledger" />
        <StatCard title="Uttar Balance Total" value={formatCurrency(uttarBalTotals.bal)} icon={Wallet} description="Uttar ledger" />
        <StatCard title="My Balance Total" value={formatCurrency(myBalTotals.bal)} icon={Scale} description="Personal net position" />
      </div>

      {/* Date Search Card */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-auto" />
            <Button onClick={handleSearch} isLoading={loading} leftIcon={<Search className="h-4 w-4" />}>
              Find Balances
            </Button>
          </div>
          <Button variant="secondary" onClick={() => router.push('/accounts')}>
            Payment Ledger &rarr;
          </Button>
        </CardContent>
      </Card>

      {/* Balance Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>My Game Balances</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable columns={gameColumns} data={gameBalList} isLoading={loading} searchPlaceholder="Search customer..." />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Uttar Balances</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable columns={gameColumns} data={uttarBalList} isLoading={loading} searchPlaceholder="Search customer..." />
          </CardContent>
        </Card>
      </div>

      {/* History Log Modal */}
      <Dialog
        isOpen={showHistModal}
        onClose={() => setShowHistModal(false)}
        title={histTitle}
        description="Historical balance transactions for selected customer."
        maxWidth="max-w-3xl"
      >
        {histLoading ? (
          <LoadingSpinner text="Fetching balance history..." />
        ) : histRows.length === 0 ? (
          <p className="text-center text-xs text-slate-500 py-6">No balance history logs.</p>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-center text-xs">
                  <thead className="bg-slate-50 font-bold uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Narration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {histRows.map((d, i) => (
                      <tr key={i} className="hover:bg-slate-50/60">
                        <td className="p-2.5 font-mono">{d.MessageDateTime ? new Date(d.MessageDateTime).toLocaleDateString('en-GB') : '-'}</td>
                        <td className="p-2.5 font-bold">{d.Type}</td>
                        <td className="p-2.5 font-bold text-emerald-600">{formatCurrency(parseFloat(d.WinAmount) || 0)}</td>
                        <td className="p-2.5 text-slate-500">{d.Narration || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
