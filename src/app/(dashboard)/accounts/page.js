'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { IndianRupee, ArrowDownLeft, ArrowUpRight, Filter, Search, Calendar, User, FileText, CheckCircle2 } from 'lucide-react';
import { API } from '../../../utils/api';
import { showToast } from '../../../utils/toast';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, StatCard } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { Button } from '../../../components/ui/button';
import { DataTable } from '../../../components/tables/DataTable';
import { LoadingSpinner } from '../../../components/ui/spinner';
import { Badge } from '../../../components/ui/badge';
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

export default function AccountsPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState(null);
  const [isStaff, setIsStaff] = useState(false);

  const [txDate, setTxDate] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showCustDropdown, setShowCustDropdown] = useState(false);

  const [txType, setTxType] = useState('Paid');
  const [amount, setAmount] = useState('');
  const [narration, setNarration] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('0');

  const [customers, setCustomers] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [customerBalance, setCustomerBalance] = useState(null);
  const [staffBalance, setStaffBalance] = useState(null);

  const [miniHistory, setMiniHistory] = useState([]);

  const [histParty, setHistParty] = useState('');
  const [histType, setHistType] = useState('');
  const [histFrom, setHistFrom] = useState('');
  const [histTo, setHistTo] = useState('');
  const [historyRows, setHistoryRows] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyTotals, setHistoryTotals] = useState({ paid: 0, recv: 0, net: 0 });

  const custFormWrapRef = useRef(null);

  useEffect(() => {
    fetchSessionUser();
    fetchLatestDate();
    loadCustomerList();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (custFormWrapRef.current && !custFormWrapRef.current.contains(e.target)) {
        setShowCustDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSessionUser = async () => {
    try {
      const r = await API.get('/sapi/auth/me');
      if (r && r.user) {
        setCurrentUser(r.user);
        setIsStaff(!!r.user.SubUID);
        if (!r.user.SubUID) {
          loadStaffList();
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLatestDate = async () => {
    try {
      const r = await API.get('/sapi/accounts/latest-date');
      const today = new Date().toISOString().split('T')[0];
      if (r && r.success && r.data) {
        const fmt = toInputDate(r.data);
        setTxDate(fmt || today);
        setHistFrom(fmt || today);
        setHistTo(fmt || today);
        loadLedgerHistory(fmt || today, fmt || today, '', '');
      } else {
        setTxDate(today);
        setHistFrom(today);
        setHistTo(today);
        loadLedgerHistory(today, today, '', '');
      }
    } catch (e) {
      const today = new Date().toISOString().split('T')[0];
      setTxDate(today);
      setHistFrom(today);
      setHistTo(today);
      loadLedgerHistory(today, today, '', '');
    }
  };

  const loadCustomerList = async () => {
    try {
      const r = await API.get('/sapi/accounts/customers');
      if (r && r.success) {
        const sorted = (r.data || []).sort((a, b) => (a.Name || '').localeCompare(b.Name || ''));
        const fullList = [{ UID: 'Self', Name: 'Self' }, ...sorted];
        setCustomers(fullList);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadStaffList = async () => {
    try {
      const r = await API.get('/sapi/accounts/subusers');
      if (r && r.success) {
        setStaffList(r.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getFilteredCustomers = () => {
    return customerSearchQuery
      ? customers.filter((c) => (c.Name || '').toLowerCase().includes(customerSearchQuery.toLowerCase()))
      : customers;
  };

  const handleSelectCustomer = async (cust) => {
    setSelectedCustomerId(cust.UID);
    setCustomerSearchQuery(cust.Name);
    setShowCustDropdown(false);
    setCustomerBalance(null);

    if (!cust.UID || cust.UID === 'Self') {
      setMiniHistory([]);
      return;
    }

    try {
      const r = await API.get(`/sapi/accounts/selected-balance?customerUID=${cust.UID}`);
      if (r && r.success) {
        setCustomerBalance(parseFloat(r.balance || 0));
      }
    } catch (e) {
      console.error(e);
    }

    fetchMiniHistory(cust.UID);
  };

  const handleClearCustomer = () => {
    setSelectedCustomerId('');
    setCustomerSearchQuery('');
    setCustomerBalance(null);
    setMiniHistory([]);
    setShowCustDropdown(false);
  };

  const fetchMiniHistory = async (cuid) => {
    setMiniHistory([]);
    const today = new Date().toISOString().split('T')[0];
    try {
      const r = await API.get(`/sapi/accounts/list?customerUID=${cuid}&fromDate=2000-01-01&toDate=${today}`);
      if (r && r.success) {
        const list = r.data || [];
        list.sort((a, b) => new Date(b.Date) - new Date(a.Date));
        setMiniHistory(list.slice(0, 10));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchStaffBalance = async (sId) => {
    setSelectedStaffId(sId);
    if (!sId || sId === '0') {
      setStaffBalance(null);
      return;
    }
    const apiDate = toApiDate(txDate);
    try {
      const r = await API.get(`/sapi/balance/staff-grid?date=${encodeURIComponent(apiDate)}`);
      if (r && r.success) {
        const matched = (r.data || []).find((s) => String(s.SubUserID) === String(sId));
        if (matched) {
          setStaffBalance(parseFloat(matched.Balance || 0));
        } else {
          setStaffBalance(null);
        }
      }
    } catch (e) {
      console.error(e);
      setStaffBalance(null);
    }
  };

  const handleSaveTransaction = async () => {
    if (!selectedCustomerId) {
      showToast('Please select customer', 'error');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showToast('Please enter a valid positive amount', 'error');
      return;
    }

    const payload = {
      customerUID: selectedCustomerId,
      date: toApiDate(txDate),
      type: txType,
      amount: parsedAmount,
      narration: narration.trim(),
      staffID: txType === 'Paid' || txType === 'Received' ? (isStaff ? currentUser.SubUID : selectedStaffId) : '0',
    };

    try {
      const r = await API.post('/sapi/accounts', payload);
      if (r && r.success) {
        showToast('Transaction saved successfully!');
        handleResetForm();
        loadLedgerHistory(histFrom, histTo, histParty, histType);
      } else {
        showToast(r?.message || 'Error saving transaction', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Error saving transaction entry', 'error');
    }
  };

  const handleResetForm = () => {
    setSelectedCustomerId('');
    setCustomerSearchQuery('');
    setCustomerBalance(null);
    setTxType('Paid');
    setAmount('');
    setNarration('');
    setSelectedStaffId('0');
    setStaffBalance(null);
    setMiniHistory([]);
  };

  const loadLedgerHistory = async (start, end, partyUID, typeVal) => {
    setLoadingHistory(true);
    setHistoryRows([]);
    setHistoryTotals({ paid: 0, recv: 0, net: 0 });

    try {
      const r = await API.get(`/sapi/accounts/list?fromDate=${start}&toDate=${end}&customerUID=${partyUID}`);
      if (r && r.success) {
        let list = r.data || [];
        if (typeVal) {
          list = list.filter((d) => d.Type === typeVal);
        }
        setHistoryRows(list);

        const totalPaid = list.reduce((s, row) => s + (parseFloat(row.Paid) || 0), 0);
        const totalRecv = list.reduce((s, row) => s + (parseFloat(row.Received) || 0), 0);
        setHistoryTotals({
          paid: totalPaid,
          recv: totalRecv,
          net: totalPaid - totalRecv,
        });
      }
    } catch (e) {
      console.error(e);
      showToast('Error loading history ledger', 'error');
    } finally {
      setLoadingHistory(false);
    }
  };

  const historyColumns = [
    {
      header: 'Date',
      accessorKey: 'Date',
      cell: ({ row }) => (
        <span className="font-medium text-xs">
          {row.original.Date ? new Date(row.original.Date).toLocaleDateString('en-GB') : '-'}
        </span>
      ),
    },
    {
      header: 'Customer',
      accessorKey: 'CustomerName',
      cell: ({ row }) => (
        <span className="font-bold text-xs capitalize text-slate-900 dark:text-white">
          {row.original.CustomerName || '-'}
        </span>
      ),
    },
    {
      header: 'Paid',
      accessorKey: 'Paid',
      cell: ({ row }) => {
        const p = parseFloat(row.original.Paid) || 0;
        return p > 0 ? (
          <span className="font-bold text-xs text-rose-600 dark:text-rose-400">{formatCurrency(p)}</span>
        ) : (
          <span className="text-xs text-slate-400">-</span>
        );
      },
    },
    {
      header: 'Received',
      accessorKey: 'Received',
      cell: ({ row }) => {
        const r = parseFloat(row.original.Received) || 0;
        return r > 0 ? (
          <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400">{formatCurrency(r)}</span>
        ) : (
          <span className="text-xs text-slate-400">-</span>
        );
      },
    },
    {
      header: 'Type',
      accessorKey: 'Type',
      cell: ({ row }) => <Badge variant="secondary">{row.original.Type}</Badge>,
    },
    {
      header: 'Narration',
      accessorKey: 'Narration',
      cell: ({ row }) => <span className="text-xs text-slate-500">{row.original.Narration || '-'}</span>,
    },
    {
      header: 'SubUser',
      accessorKey: 'StaffName',
      cell: ({ row }) => <span className="text-xs font-semibold">{row.original.StaffName || '-'}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounts & Payment Ledger"
        description="Record cash payments, receipts, adjustments, and review ledger balances."
      />

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Paid"
          value={formatCurrency(historyTotals.paid)}
          icon={ArrowUpRight}
          description="Outflow payments"
        />
        <StatCard
          title="Total Received"
          value={formatCurrency(historyTotals.recv)}
          icon={ArrowDownLeft}
          description="Inflow receipts"
        />
        <StatCard
          title="Net Cashflow Balance"
          value={formatCurrency(historyTotals.net)}
          icon={IndianRupee}
          trend={historyTotals.net >= 0 ? 'up' : 'down'}
          change={historyTotals.net >= 0 ? 'Profit' : 'Deficit'}
          description="Net ledger position"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form Entry Card */}
        <div className="lg:col-span-5">
          <Card>
            <CardHeader>
              <CardTitle>Record Payment / Receipt</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Date"
                  type="date"
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                />

                {/* Customer Autocomplete Input */}
                <div className="space-y-1.5" ref={custFormWrapRef}>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Customer Name
                  </label>
                  <div className="relative">
                    <Input
                      placeholder="Select Customer..."
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
                            key={c.UID || idx}
                            onMouseDown={() => handleSelectCustomer(c)}
                            className="px-3 py-2 text-xs font-medium cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100"
                          >
                            {c.Name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {customerBalance !== null && (
                    <p className={`text-xs font-bold ${customerBalance < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                      Net Bal: {formatCurrency(customerBalance)}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select label="Type" value={txType} onChange={(e) => setTxType(e.target.value)}>
                  <option value="Paid">Paid</option>
                  <option value="Received">Received</option>
                  <option value="Paid Adjustment">Paid Adjustment</option>
                  <option value="Receive Adjustment">Receive Adjustment</option>
                  <option value="Commission">Commission</option>
                </Select>

                <Input
                  label="Amount (₹)"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Narration / Note"
                  placeholder="Add note..."
                  value={narration}
                  onChange={(e) => setNarration(e.target.value)}
                />
                {!isStaff && (
                  <Select label="Sub User" value={selectedStaffId} onChange={(e) => fetchStaffBalance(e.target.value)}>
                    <option value="0">Self</option>
                    {staffList.map((s) => (
                      <option key={s.SubUserID} value={s.SubUserID}>
                        {s.subusername}
                      </option>
                    ))}
                  </Select>
                )}
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button className="flex-1" onClick={handleSaveTransaction} leftIcon={<CheckCircle2 className="h-4 w-4" />}>
                  SUBMIT ENTRY
                </Button>
                <Button variant="outline" onClick={handleResetForm}>
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Ledger Audit Log Card */}
        <div className="lg:col-span-7">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle>Accounts Ledger Audit</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={histParty} onChange={(e) => setHistParty(e.target.value)} className="w-auto">
                  <option value="">All Customers</option>
                  {customers.filter((c) => c.UID !== 'Self').map((c) => (
                    <option key={c.UID} value={c.UID}>
                      {c.Name}
                    </option>
                  ))}
                </Select>
                <Select value={histType} onChange={(e) => setHistType(e.target.value)} className="w-auto">
                  <option value="">All Types</option>
                  <option value="Paid">Paid</option>
                  <option value="Received">Received</option>
                  <option value="Paid Adjustment">Paid Adjustment</option>
                  <option value="Receive Adjustment">Receive Adjustment</option>
                  <option value="Commission">Commission</option>
                </Select>
                <Button onClick={() => loadLedgerHistory(histFrom, histTo, histParty, histType)}>
                  Filter
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={historyColumns}
                data={historyRows}
                isLoading={loadingHistory}
                searchPlaceholder="Search history notes or customer..."
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
