'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Scale, Search, Send, Trash2, ArrowUpRight } from 'lucide-react';
import { API } from '../../../utils/api';
import { showToast } from '../../../utils/toast';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, StatCard } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
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

export default function LCPage() {
  const router = useRouter();

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterQuery, setFilterQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const [mainList, setMainList] = useState([]);
  const [filteredMainList, setFilteredMainList] = useState([]);
  const [uttarList, setUttarList] = useState([]);
  const [refList, setRefList] = useState([]);
  const [hissaList, setHissaList] = useState([]);

  const [deleteDate, setDeleteDate] = useState('');
  const [submittingDelete, setSubmittingDelete] = useState(false);
  const [submittingPost, setSubmittingPost] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('History');
  const [modalData, setModalData] = useState({ totalAmt: 0, comm: 0, win: 0, pati: 0, balance: 0 });

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const firstDay = new Date();
    firstDay.setDate(1);
    const firstDayStr = firstDay.toISOString().split('T')[0];

    setDateFrom(firstDayStr);
    setDateTo(today);
    setDeleteDate(today);

    loadLCData(firstDayStr, today);
  }, []);

  const loadLCData = async (start, end) => {
    setLoading(true);

    const fDate = toApiDate(start);
    const tDate = toApiDate(end);
    const p = `?dateFrom=${encodeURIComponent(fDate)}&dateTo=${encodeURIComponent(tDate)}`;

    try {
      const [r1, r2, r3, r4] = await Promise.all([
        API.get('/sapi/lc/main' + p),
        API.get('/sapi/lc/uttar' + p),
        API.get('/sapi/lc/reference' + p),
        API.get('/sapi/lc/third-party' + p),
      ]);

      const mainData = r1?.data || [];
      setMainList(mainData);
      setFilteredMainList(mainData);

      setUttarList(r2?.data || []);
      setRefList(r3?.data || []);
      setHissaList(r4?.data || []);
    } catch (e) {
      console.error(e);
      showToast('Error loading LC reports', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadLCData(dateFrom, dateTo);
  };

  const handleLiveFilter = (e) => {
    const term = e.target.value;
    setFilterQuery(term);
    if (!term.trim()) {
      setFilteredMainList(mainList);
    } else {
      setFilteredMainList(
        mainList.filter(
          (r) =>
            (r.CustomerName || '').toLowerCase().includes(term.toLowerCase()) ||
            (r.Mobile || '').toLowerCase().includes(term.toLowerCase())
        )
      );
    }
  };

  const handlePostLC = async () => {
    if (!dateTo) {
      showToast('Please select To Date first', 'error');
      return;
    }
    if (!confirm('Do you want to Post LC?')) return;

    setSubmittingPost(true);
    const fDateTo = toApiDate(dateTo);

    try {
      const r = await API.post('/sapi/lc/post', {
        dateTo: fDateTo,
        mainRows: mainList.map((r) => ({ fCusID: r.fCusID || r.UID, LCAmount: r.LCAmount })),
        uttarRows: uttarList.map((r) => ({ fCusID: r.fCusID || r.UID, LCAmount: r.LCAmount })),
        hissaRows: hissaList.map((r) => ({ fCusID: r.fCusID || r.UID, LCAmount: r.LCAmount })),
        referenceRows: refList.map((r) => ({ fCusID: r.fCusID || r.UID, LCAmount: r.LCAmount })),
      });

      if (r && r.success) {
        showToast('LC Posted Successfully!');
        handleSearch();
      } else {
        showToast(r?.message || 'LC Already Exists!', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Connection error posting LC', 'error');
    } finally {
      setSubmittingPost(false);
    }
  };

  const handleDeleteLC = async () => {
    if (!deleteDate) {
      showToast('Please select date first', 'error');
      return;
    }
    if (!confirm('Do you want to Delete it?')) return;

    setSubmittingDelete(true);
    const fDeleteDate = toApiDate(deleteDate);

    try {
      const r = await API.delete('/sapi/lc/delete', { date: fDeleteDate });
      if (r && r.success) {
        showToast('Data Deleted Successfully!');
        handleSearch();
      } else {
        showToast(r?.message || 'Error deleting LC', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Connection error deleting LC', 'error');
    } finally {
      setSubmittingDelete(false);
    }
  };

  const getMainTotals = () => {
    const totAdjWin = filteredMainList.reduce((s, r) => s + (parseFloat(r.AdjustWinAmount) || 0), 0);
    const totLC = filteredMainList.reduce((s, r) => s + (parseFloat(r.LCAmount) || 0), 0);
    return { totAdjWin, totLC };
  };

  const mainTotals = getMainTotals();

  const mainColumns = [
    {
      header: 'Customer',
      accessorKey: 'CustomerName',
      cell: ({ row }) => (
        <div>
          <span className="font-bold text-xs capitalize text-slate-900 dark:text-white">{row.original.CustomerName}</span>
          <span className="block text-[11px] text-slate-500 font-mono">{row.original.Mobile}</span>
        </div>
      ),
    },
    {
      header: 'Sale Balance',
      accessorKey: 'WinAmount',
      cell: ({ row }) => <span className="text-xs font-mono">{formatCurrency(parseFloat(row.original.WinAmount) || 0)}</span>,
    },
    {
      header: 'Adjust Amt',
      accessorKey: 'AdjustAmount',
      cell: ({ row }) => <span className="text-xs font-mono">{formatCurrency(parseFloat(row.original.AdjustAmount) || 0)}</span>,
    },
    {
      header: 'Net Balance',
      accessorKey: 'AdjustWinAmount',
      cell: ({ row }) => {
        const b = parseFloat(row.original.AdjustWinAmount) || 0;
        return <span className={`font-bold text-xs ${b < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{formatCurrency(b)}</span>;
      },
    },
    {
      header: 'LC(%)',
      accessorKey: 'LC',
      cell: ({ row }) => <span className="text-xs font-bold font-mono">{row.original.LC || 0}%</span>,
    },
    {
      header: 'LC Amount',
      accessorKey: 'LCAmount',
      cell: ({ row }) => {
        const lc = parseFloat(row.original.LCAmount) || 0;
        return <span className={`font-bold text-xs ${lc < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{formatCurrency(lc)}</span>;
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="LC Commission Percentage Reports"
        description="Calculate customer Loss/Commission splits, post settlements, and audit reference percentages."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard title="Net Balance Split" value={formatCurrency(mainTotals.totAdjWin)} icon={Scale} description="Aggregate customer turnover net balance" />
        <StatCard title="Total LC Commission Amount" value={formatCurrency(mainTotals.totLC)} icon={ArrowUpRight} description="Calculated LC commission sum" />
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <Input label="From Date" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <Input label="To Date" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            <div className="flex items-center gap-2">
              <Button variant="primary" className="font-bold uppercase tracking-wider" onClick={handleSearch} isLoading={loading} leftIcon={<Search className="h-4 w-4" />}>
                SEARCH
              </Button>
              <Button variant="success" onClick={handlePostLC} isLoading={submittingPost} leftIcon={<Send className="h-4 w-4" />}>
                POST LC
              </Button>
            </div>
            <Input placeholder="Filter Name / Mobile..." value={filterQuery} onChange={handleLiveFilter} leftIcon={<Search className="h-4 w-4" />} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Main LC Percentage Breakdown ({filteredMainList.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={mainColumns} data={filteredMainList} isLoading={loading} searchPlaceholder="Search..." />
        </CardContent>
      </Card>

      {/* Delete LC section */}
      <Card>
        <CardHeader>
          <CardTitle>Delete Commission Record</CardTitle>
        </CardHeader>
        <CardContent className="p-4 flex items-center gap-4">
          <Input type="date" value={deleteDate} onChange={(e) => setDeleteDate(e.target.value)} className="w-auto" />
          <Button variant="danger" className="font-bold uppercase tracking-wider" onClick={handleDeleteLC} isLoading={submittingDelete} leftIcon={<Trash2 className="h-4 w-4" />}>
            DELETE LC
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
