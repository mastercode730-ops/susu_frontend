'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Scale, Search, Download, Calendar, Gamepad2, User } from 'lucide-react';
import { API } from '../../../utils/api';
import { showToast } from '../../../utils/toast';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, StatCard } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { Button } from '../../../components/ui/button';
import { DataTable } from '../../../components/tables/DataTable';
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

export default function HisabSummaryPage() {
  const router = useRouter();

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedGameId, setSelectedGameId] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');

  const [games, setGames] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [showCustDropdown, setShowCustDropdown] = useState(false);

  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableTotals, setTableTotals] = useState({
    tSale: 0, dSale: 0, aSale: 0, comm: 0, oDara: 0, oAkhar: 0, win: 0, pati: 0, bal: 0,
  });

  const custWrapRef = useRef(null);

  useEffect(() => {
    fetchLatestDate();
    loadGames();
    loadCustomers();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (custWrapRef.current && !custWrapRef.current.contains(e.target)) {
        setShowCustDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchLatestDate = async () => {
    try {
      const r = await API.get('/sapi/hisab/latest-date');
      if (r && r.success && r.data) {
        const inputD = toInputDate(r.data);
        setFromDate(inputD);
        setToDate(inputD);
      } else {
        const today = new Date().toISOString().split('T')[0];
        setFromDate(today);
        setToDate(today);
      }
    } catch (e) {
      const today = new Date().toISOString().split('T')[0];
      setFromDate(today);
      setToDate(today);
    }
  };

  const loadGames = async () => {
    try {
      const r = await API.get('/sapi/game');
      if (r && r.success) {
        setGames(r.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadCustomers = async () => {
    try {
      const r = await API.get('/sapi/hisab/customers');
      if (r && r.success) {
        const sorted = (r.data || []).sort((a, b) =>
          (a.CustomerName || '').localeCompare(b.CustomerName || '')
        );
        setCustomers(sorted);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getFilteredCustomers = () => {
    const list = customerSearchQuery
      ? customers.filter((c) => (c.CustomerName || '').toLowerCase().includes(customerSearchQuery.toLowerCase()))
      : customers;
    return [{ UID: '', CustomerName: 'All Customer' }, ...list].slice(0, 20);
  };

  const handleSelectCustomer = (uid, name) => {
    setSelectedCustomerId(uid);
    setCustomerSearchQuery(uid ? name : '');
    setShowCustDropdown(false);
  };

  const handleClearCustomer = () => {
    setSelectedCustomerId('');
    setCustomerSearchQuery('');
    setShowCustDropdown(false);
  };

  const handleSearch = async () => {
    setLoading(true);
    setTableData([]);

    const sDate = toApiDate(fromDate);
    const eDate = toApiDate(toDate);
    const gid = selectedGameId;
    const cid = selectedCustomerId;

    try {
      const r = await API.get(
        `/sapi/hisab/summary?startDate=${encodeURIComponent(sDate)}&endDate=${encodeURIComponent(eDate)}&gid=${gid}&cid=${cid}`
      );
      if (r && r.success && r.data?.length > 0) {
        const data = r.data;
        setTableData(data);

        const s = (f) => Math.round(data.reduce((a, r) => a + (parseFloat(r[f]) || 0), 0));
        setTableTotals({
          tSale: s('Total_Amount'),
          dSale: s('D_Sale'),
          aSale: s('A_Sale'),
          comm: s('Commision'),
          oDara: s('O_Dara'),
          oAkhar: s('O_Akhar'),
          win: s('WinAmount'),
          pati: s('Pati'),
          bal: s('Balance'),
        });
      } else {
        setTableData([]);
        showToast('No records found');
      }
    } catch (e) {
      console.error(e);
      showToast('Error fetching summaries', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (tableData.length === 0) {
      showToast('Please search records before exporting!', 'error');
      return;
    }

    const sDate = toApiDate(fromDate);
    const eDate = toApiDate(toDate);
    const gid = selectedGameId;
    const cid = selectedCustomerId;

    let fileName = 'AllSummary';
    const activeGameObj = games.find((g) => String(g.GID) === String(gid));
    const activeCustObj = customers.find((c) => String(c.UID) === String(cid));

    if (activeGameObj && activeCustObj) {
      fileName = activeGameObj.GameName + activeCustObj.CustomerName;
    } else if (activeCustObj) {
      fileName = activeCustObj.CustomerName;
    } else if (activeGameObj) {
      fileName = activeGameObj.GameName;
    }
    fileName += sDate.replace(/\//g, '');

    const exportUrl = `${window.location.origin}/sapi/hisab/summary/export?startDate=${encodeURIComponent(
      sDate
    )}&endDate=${encodeURIComponent(eDate)}&gid=${gid}&cid=${cid}&fileName=${encodeURIComponent(fileName)}`;

    window.location.href = exportUrl;
  };

  const columns = [
    {
      header: 'Customer',
      accessorKey: 'Mobile',
      cell: ({ row }) => <span className="font-bold text-xs capitalize text-slate-900 dark:text-white">{row.original.Mobile || '-'}</span>,
    },
    {
      header: 'Game',
      accessorKey: 'GameName',
      cell: ({ row }) => <span className="text-xs font-semibold">{row.original.GameName || '-'}</span>,
    },
    {
      header: 'Rates',
      accessorKey: 'Rates',
      cell: ({ row }) => <span className="text-xs text-slate-500 font-mono">{row.original.Rates || '-'}</span>,
    },
    {
      header: 'Total Sale',
      accessorKey: 'Total_Amount',
      cell: ({ row }) => <span className="font-bold text-xs text-slate-900 dark:text-white">{formatCurrency(parseFloat(row.original.Total_Amount) || 0)}</span>,
    },
    {
      header: 'Comm',
      accessorKey: 'Commision',
      cell: ({ row }) => <span className="text-xs text-slate-600">{formatCurrency(parseFloat(row.original.Commision) || 0)}</span>,
    },
    {
      header: 'Win Amt',
      accessorKey: 'WinAmount',
      cell: ({ row }) => <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400">{formatCurrency(parseFloat(row.original.WinAmount) || 0)}</span>,
    },
    {
      header: 'Balance',
      accessorKey: 'Balance',
      cell: ({ row }) => {
        const b = parseFloat(row.original.Balance) || 0;
        return <span className={`font-bold text-xs ${b < 0 ? 'text-rose-600' : 'text-blue-600'}`}>{formatCurrency(b)}</span>;
      },
    },
    {
      header: 'Result',
      accessorKey: 'Result',
      cell: ({ row }) => <span className="font-mono font-bold text-xs">{row.original.Result || '-'}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hisab Summary Report"
        description="Detailed turnover, commission, win payout, and balance reports aggregated across games and customers."
        actions={
          <Button variant="outline" onClick={handleExportExcel} leftIcon={<Download className="h-4 w-4" />}>
            Export Excel
          </Button>
        }
      />

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Aggregated Sale"
          value={formatCurrency(tableTotals.tSale)}
          icon={Scale}
          description="Total turnover across filter"
        />
        <StatCard
          title="Total Win Payout"
          value={formatCurrency(tableTotals.win)}
          icon={Scale}
          description="Winning bets payout total"
        />
        <StatCard
          title="Net Ledger Balance"
          value={formatCurrency(tableTotals.bal)}
          icon={Scale}
          trend={tableTotals.bal >= 0 ? 'up' : 'down'}
          change={tableTotals.bal >= 0 ? 'Net Profit' : 'Net Loss'}
          description="Final settlement balance"
        />
      </div>

      {/* Filters Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>Summary Filter Criteria</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input label="From Date" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <Input label="To Date" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            <Select label="Game" value={selectedGameId} onChange={(e) => setSelectedGameId(e.target.value)}>
              <option value="">All Games</option>
              {games.map((g) => (
                <option key={g.GID} value={g.GID}>
                  {g.GameName}
                </option>
              ))}
            </Select>

            {/* Customer Dropdown */}
            <div className="space-y-1.5" ref={custWrapRef}>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Customer
              </label>
              <div className="relative">
                <Input
                  placeholder="All Customers..."
                  value={customerSearchQuery}
                  onChange={(e) => {
                    setCustomerSearchQuery(e.target.value);
                    setShowCustDropdown(true);
                  }}
                  onFocus={() => setShowCustDropdown(true)}
                />
                {showCustDropdown && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
                    {getFilteredCustomers().map((c, idx) => (
                      <div
                        key={idx}
                        onMouseDown={() => handleSelectCustomer(c.UID, c.CustomerName)}
                        className="px-3 py-2 text-xs font-medium cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100"
                      >
                        {c.CustomerName}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button onClick={handleSearch} isLoading={loading} leftIcon={<Search className="h-4 w-4" />}>
              SEARCH SUMMARY
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Table Card */}
      <Card>
        <CardHeader>
          <CardTitle>Hisab Summary Breakdown ({tableData.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={tableData}
            isLoading={loading}
            searchPlaceholder="Search by mobile or game..."
          />
        </CardContent>
      </Card>
    </div>
  );
}
