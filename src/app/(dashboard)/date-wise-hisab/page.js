'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Search, ArrowUpRight, Scale } from 'lucide-react';
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

export default function DateWiseHisabPage() {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [totals, setTotals] = useState({ sale: 0, bal: 0 });

  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('Hisab History');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalData, setModalData] = useState(null);

  useEffect(() => {
    fetchLatestDate();
  }, []);

  const fetchLatestDate = async () => {
    try {
      const r = await API.get('/sapi/hisab/latest-date');
      if (r && r.success && r.data) {
        const inputD = toInputDate(r.data);
        setFromDate(inputD);
        setToDate(inputD);
        loadSummary(inputD, inputD);
      } else {
        const today = new Date().toISOString().split('T')[0];
        setFromDate(today);
        setToDate(today);
        loadSummary(today, today);
      }
    } catch (e) {
      const today = new Date().toISOString().split('T')[0];
      setFromDate(today);
      setToDate(today);
      loadSummary(today, today);
    }
  };

  const loadSummary = async (start, end) => {
    setLoading(true);
    setRecords([]);
    setTotals({ sale: 0, bal: 0 });

    const fDate = toApiDate(start);
    const tDate = toApiDate(end);

    try {
      const r = await API.get(
        `/sapi/hisab/date-wise-summary?fromDate=${encodeURIComponent(fDate)}&toDate=${encodeURIComponent(tDate)}`
      );
      if (r && r.success) {
        const list = r.data || [];
        setRecords(list);

        const totSale = list.reduce((s, row) => s + (parseFloat(row.Total_Amount) || 0), 0);
        const totBal = list.reduce((s, row) => s + (parseFloat(row.Balance) || 0), 0);
        setTotals({ sale: totSale, bal: totBal });
      }
    } catch (e) {
      console.error(e);
      showToast('Error loading date wise summaries', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadSummary(fromDate, toDate);
  };

  const handleShowHistory = async (row) => {
    setModalLoading(true);
    setShowModal(true);
    setModalData(null);
    setModalTitle('Loading Hisab History...');

    const fDate = toApiDate(fromDate);
    const tDate = toApiDate(toDate);
    const uid = row.fSenderID;
    const typeSelf = row.Self || 0;

    try {
      const r = await API.get(
        `/sapi/hisab/date-wise-user?uid=${uid}&fromDate=${encodeURIComponent(fDate)}&toDate=${encodeURIComponent(tDate)}`
      );
      if (r && r.success && r.data?.length > 0) {
        const data = r.data;
        const rowIdx = data.length === 2 ? parseInt(typeSelf) : 0;
        const d = data[rowIdx] || data[0];

        setModalTitle(`${d.Mobile || ''} (${fDate} to ${tDate}) Hisab History`);
        setModalData(d);
      } else {
        setModalTitle('No Data Found!');
      }
    } catch (e) {
      console.error(e);
      setModalTitle('Error loading history details');
    } finally {
      setModalLoading(false);
    }
  };

  const columns = [
    {
      header: 'Customer',
      accessorKey: 'Mobile',
      cell: ({ row }) => (
        <button
          onClick={() => handleShowHistory(row.original)}
          className="font-bold text-xs text-blue-600 hover:underline dark:text-blue-400"
        >
          {row.original.Mobile || row.original.fSenderID}
        </button>
      ),
    },
    {
      header: 'Total Sale',
      accessorKey: 'Total_Amount',
      cell: ({ row }) => (
        <span className="font-bold text-xs text-slate-900 dark:text-white">
          {formatCurrency(parseFloat(row.original.Total_Amount) || 0)}
        </span>
      ),
    },
    {
      header: 'Net Balance',
      accessorKey: 'Balance',
      cell: ({ row }) => {
        const bal = parseFloat(row.original.Balance) || 0;
        return (
          <span className={`font-bold text-xs ${bal < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {formatCurrency(bal)}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Date Wise Hisab Report"
        description="View date-range financial summaries and detailed ledger cards for customers."
      />

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          title="Date Range Total Sale"
          value={formatCurrency(totals.sale)}
          icon={ArrowUpRight}
          description="Total turnover in date range"
        />
        <StatCard
          title="Date Range Net Balance"
          value={formatCurrency(totals.bal)}
          icon={Scale}
          trend={totals.bal >= 0 ? 'up' : 'down'}
          change={totals.bal >= 0 ? 'Profit' : 'Deficit'}
          description="Net balance position"
        />
      </div>

      {/* Filter Card */}
      <Card>
        <CardHeader>
          <CardTitle>Date Range Criteria</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <Input label="From Date" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <Input label="To Date" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            <Button onClick={handleSearch} isLoading={loading} leftIcon={<Search className="h-4 w-4" />}>
              SEARCH HISAB
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table Card */}
      <Card>
        <CardHeader>
          <CardTitle>Date Wise Hisab Summary ({records.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={records}
            isLoading={loading}
            searchPlaceholder="Search customer or mobile..."
          />
        </CardContent>
      </Card>

      {/* Modal Details */}
      <Dialog
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={modalTitle}
        description="Individual customer ledger breakdown."
        maxWidth="max-w-md"
      >
        {modalLoading ? (
          <LoadingSpinner text="Fetching user history details..." />
        ) : !modalData ? (
          <p className="text-center text-xs text-slate-500 py-6">No matching record detail.</p>
        ) : (
          <div className="space-y-3">
            <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex justify-between py-1.5 font-semibold">
                <span className="text-slate-500">Total Sale</span>
                <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(modalData.Total_Amount)}</span>
              </div>
              <div className="flex justify-between py-1.5 font-semibold">
                <span className="text-slate-500">Dara Sale</span>
                <span>{formatCurrency(modalData.D_Sale)}</span>
              </div>
              <div className="flex justify-between py-1.5 font-semibold">
                <span className="text-slate-500">Akhar Sale</span>
                <span>{formatCurrency(modalData.A_Sale)}</span>
              </div>
              <div className="flex justify-between py-1.5 font-semibold">
                <span className="text-slate-500">Commission</span>
                <span>{formatCurrency(modalData.Commision)}</span>
              </div>
              <div className="flex justify-between py-1.5 font-semibold">
                <span className="text-slate-500">Win Amount</span>
                <span className="text-emerald-600">{formatCurrency(modalData.WinAmount)}</span>
              </div>
              <div className="flex justify-between py-1.5 font-bold border-t border-slate-200 dark:border-slate-800 pt-2 text-sm">
                <span className="text-blue-600 dark:text-blue-400">Net Balance</span>
                <span className="text-blue-600 dark:text-blue-400">{formatCurrency(modalData.Balance)}</span>
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
