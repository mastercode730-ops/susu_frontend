'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { IndianRupee, ArrowDownLeft, ArrowUpRight, Printer, CheckCircle2, Trash2 } from 'lucide-react';
import { API } from '../../../utils/api';
import { showToast } from '../../../utils/toast';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, StatCard } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { Button } from '../../../components/ui/button';
import { DataTable } from '../../../components/tables/DataTable';
import { Badge } from '../../../components/ui/badge';
import { formatCurrency } from '../../../lib/utils';

// Dense "label beside field" row — bold, dark label to the left of the field,
// matching the reference layout's professional data-entry form look.
function FormRow({ label, children }) {
  return (
    <div className="grid grid-cols-[90px_1fr] items-center gap-x-3">
      <label className="text-sm font-bold text-slate-800">{label}</label>
      {children}
    </div>
  );
}

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

function formatShortDate(v) {
  if (!v) return '-';
  const d = new Date(v);
  return isNaN(d) ? String(v) : d.toLocaleDateString('en-GB');
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
  const [selectedEntry, setSelectedEntry] = useState(null); // { AID, ... } — for Delete
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  const [histParty, setHistParty] = useState('');
  const [histType, setHistType] = useState('');
  const [histFrom, setHistFrom] = useState('');
  const [histTo, setHistTo] = useState('');
  const [historyRows, setHistoryRows] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyTotals, setHistoryTotals] = useState({ paid: 0, recv: 0, net: 0 });

  const custFormWrapRef = useRef(null);
  const partyInputRef = useRef(null);
  const historyTypeRef = useRef(null);

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

  // Keyboard shortcuts shown in the footer hints, like the reference app:
  // Ctrl+P focuses the Party field on the entry form, Ctrl+T focuses the
  // History panel's Type filter.
  useEffect(() => {
    const onKeyDown = (e) => {
      if (!e.ctrlKey) return;
      const key = e.key.toLowerCase();
      if (key === 'p') {
        e.preventDefault();
        partyInputRef.current?.focus();
      } else if (key === 't') {
        e.preventDefault();
        historyTypeRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
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
    setSelectedEntry(null);

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
    setSelectedEntry(null);
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
      showToast('Please select party', 'error');
      partyInputRef.current?.focus();
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

    setSaving(true);
    try {
      const r = await API.post('/sapi/accounts', payload);
      if (r && r.success) {
        showToast('Entry saved successfully!');
        const cuid = selectedCustomerId;
        setAmount('');
        setNarration('');
        setSelectedEntry(null);
        loadLedgerHistory(histFrom, histTo, histParty, histType);
        if (cuid && cuid !== 'Self') fetchMiniHistory(cuid);
      } else {
        showToast(r?.message || 'Error saving entry', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Error saving transaction entry', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Selecting a row from the party's mini-history below the Party field —
  // there is no "edit" on the backend (Accounts only supports create and
  // delete), so this just arms the Delete button for that entry.
  const handleSelectMiniEntry = (row) => {
    setSelectedEntry(row);
  };

  const handleDeleteEntry = async () => {
    if (!selectedEntry?.AID) return;
    if (!window.confirm('Delete this accounts entry? This cannot be undone.')) return;

    setDeleting(true);
    try {
      const r = await API.delete(`/sapi/accounts/${selectedEntry.AID}`);
      if (r && r.success) {
        showToast(r.pairedDeleted ? 'Entry and its paired transfer leg deleted' : 'Entry deleted');
        setSelectedEntry(null);
        loadLedgerHistory(histFrom, histTo, histParty, histType);
        if (selectedCustomerId && selectedCustomerId !== 'Self') fetchMiniHistory(selectedCustomerId);
      } else {
        showToast(r?.message || 'Error deleting entry', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Error deleting entry', 'error');
    } finally {
      setDeleting(false);
    }
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
    { header: 'SrNo', accessorKey: 'idx', cell: ({ row }) => <span className="text-xs text-slate-500">{row.index + 1}</span> },
    {
      header: 'Party',
      accessorKey: 'CustomerName',
      cell: ({ row }) => (
        <span className="font-bold text-xs capitalize text-slate-900">
          {row.original.CustomerName || '-'}
        </span>
      ),
    },
    {
      header: 'Date',
      accessorKey: 'Date',
      cell: ({ row }) => (
        <span className="font-bold text-xs text-slate-800">
          {formatShortDate(row.original.Date)}
        </span>
      ),
    },
    {
      header: 'Diye',
      accessorKey: 'Paid',
      cell: ({ row }) => {
        const p = parseFloat(row.original.Paid) || 0;
        return p > 0 ? (
          <span className="font-bold text-xs text-rose-600">{formatCurrency(p)}</span>
        ) : (
          <span className="text-xs text-slate-400">-</span>
        );
      },
    },
    {
      header: 'Liye',
      accessorKey: 'Received',
      cell: ({ row }) => {
        const r = parseFloat(row.original.Received) || 0;
        return r > 0 ? (
          <span className="font-bold text-xs text-emerald-600">{formatCurrency(r)}</span>
        ) : (
          <span className="text-xs text-slate-400">-</span>
        );
      },
    },
    {
      header: 'Narration',
      accessorKey: 'Narration',
      cell: ({ row }) => <span className="text-xs text-slate-700 font-semibold">{row.original.Narration || '-'}</span>,
    },
    {
      header: 'Sub User',
      accessorKey: 'StaffName',
      cell: ({ row }) => <span className="text-xs font-semibold text-slate-700">{row.original.StaffName || '-'}</span>,
    },
    {
      header: 'Voucher Type',
      accessorKey: 'Type',
      cell: ({ row }) => <Badge variant="secondary">{row.original.Type}</Badge>,
    },
  ];

  const handlePrintHistory = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounts & Payment Ledger"
        description="Record cash payments, receipts, adjustments, and review ledger balances."
      />

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Paid (Diye)"
          value={formatCurrency(historyTotals.paid)}
          icon={ArrowUpRight}
          description="Outflow payments"
        />
        <StatCard
          title="Total Received (Liye)"
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Accounts entry form */}
        <div className="lg:col-span-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-slate-900 font-extrabold">Accounts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3.5">
              {/* Party autocomplete */}
              <FormRow label="Party">
                <div className="relative" ref={custFormWrapRef}>
                  <Input
                    ref={partyInputRef}
                    placeholder="Select Party..."
                    value={customerSearchQuery}
                    onChange={(e) => {
                      setCustomerSearchQuery(e.target.value);
                      setShowCustDropdown(true);
                    }}
                    onFocus={() => setShowCustDropdown(true)}
                    className="font-semibold text-slate-900"
                  />
                  {showCustDropdown && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                      {getFilteredCustomers().map((c, idx) => (
                        <div
                          key={c.UID || idx}
                          onMouseDown={() => handleSelectCustomer(c)}
                          className="px-3 py-2 text-xs font-medium cursor-pointer hover:bg-slate-100 text-slate-900"
                        >
                          {c.Name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </FormRow>
              {customerBalance !== null && (
                <p className={`-mt-2 pl-[102px] text-xs font-extrabold ${customerBalance < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  Net Balance: {formatCurrency(customerBalance)}
                </p>
              )}

              {/* Recent entries for the selected party */}
              {selectedCustomerId && selectedCustomerId !== 'Self' && (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="max-h-40 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                        <tr>
                          <th className="px-2.5 py-1.5 text-left">Date</th>
                          <th className="px-2.5 py-1.5 text-right">Diye</th>
                          <th className="px-2.5 py-1.5 text-right">Liye</th>
                          <th className="px-2.5 py-1.5 text-left">Narration</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {miniHistory.length === 0 ? (
                          <tr><td colSpan={4} className="px-2.5 py-3 text-center text-slate-400">No recent entries</td></tr>
                        ) : (
                          miniHistory.map((row, i) => {
                            const isSel = selectedEntry && selectedEntry.AID === row.AID;
                            const paid = parseFloat(row.Paid) || 0;
                            const recv = parseFloat(row.Received) || 0;
                            return (
                              <tr
                                key={row.AID || i}
                                onClick={() => handleSelectMiniEntry(row)}
                                className={`cursor-pointer ${isSel ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                              >
                                <td className="px-2.5 py-1.5 font-bold text-slate-800 whitespace-nowrap">{formatShortDate(row.Date)}</td>
                                <td className="px-2.5 py-1.5 text-right font-bold text-rose-600">{paid > 0 ? formatCurrency(paid) : '-'}</td>
                                <td className="px-2.5 py-1.5 text-right font-bold text-emerald-600">{recv > 0 ? formatCurrency(recv) : '-'}</td>
                                <td className="px-2.5 py-1.5 text-slate-600 truncate max-w-[100px]">{row.Narration || '-'}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <FormRow label="Date">
                <Input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} className="font-bold text-slate-900" />
              </FormRow>

              <FormRow label="Amount">
                <Input
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                  className="font-bold text-slate-900"
                />
              </FormRow>

              <FormRow label="Type">
                <Select value={txType} onChange={(e) => setTxType(e.target.value)} className="font-semibold text-slate-900">
                  <option value="Paid">Paid (Diye)</option>
                  <option value="Received">Received (Liye)</option>
                  <option value="Paid Adjustment">Paid Adjustment</option>
                  <option value="Receive Adjustment">Receive Adjustment</option>
                  <option value="Commission">Commission</option>
                </Select>
              </FormRow>

              <FormRow label="Narration">
                <Input
                  placeholder="Add note..."
                  value={narration}
                  onChange={(e) => setNarration(e.target.value)}
                  className="font-semibold text-slate-900"
                />
              </FormRow>

              {!isStaff && (
                <FormRow label="Sub User">
                  <Select value={selectedStaffId} onChange={(e) => fetchStaffBalance(e.target.value)} className="font-semibold text-slate-900">
                    <option value="0">Self</option>
                    {staffList.map((s) => (
                      <option key={s.SubUserID} value={s.SubUserID}>
                        {s.subusername}
                      </option>
                    ))}
                  </Select>
                </FormRow>
              )}

              <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
                <Button variant="primary" className="flex-1 font-bold uppercase tracking-wider" onClick={handleSaveTransaction} isLoading={saving} leftIcon={<CheckCircle2 className="h-4 w-4" />}>
                  Save
                </Button>
                <Button
                  variant="danger"
                  disabled={!selectedEntry}
                  isLoading={deleting}
                  onClick={handleDeleteEntry}
                  leftIcon={<Trash2 className="h-4 w-4" />}
                >
                  Delete
                </Button>
                <Button variant="outline" onClick={handleResetForm}>
                  Reset
                </Button>
              </div>
            </CardContent>
            <div className="px-6 pb-4 pt-1 text-xs font-bold text-rose-700">
              Ctrl+P : Focus Party For Entry
            </div>
          </Card>
        </div>

        {/* Right: History */}
        <div className="lg:col-span-7">
          <Card>
            <CardHeader>
              <CardTitle className="text-slate-900 font-extrabold">History</CardTitle>
              <div className="flex flex-wrap items-end gap-2.5 pt-2">
                <div>
                  <span className="block text-[11px] font-bold text-slate-800 mb-1">Party</span>
                  <Select value={histParty} onChange={(e) => setHistParty(e.target.value)} wrapperClassName="w-40" className="w-full text-xs">
                    <option value="">All</option>
                    {customers.filter((c) => c.UID !== 'Self').map((c) => (
                      <option key={c.UID} value={c.UID}>
                        {c.Name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <span className="block text-[11px] font-bold text-slate-800 mb-1">Type</span>
                  <Select ref={historyTypeRef} value={histType} onChange={(e) => setHistType(e.target.value)} wrapperClassName="w-36" className="w-full text-xs">
                    <option value="">All</option>
                    <option value="Paid">Paid</option>
                    <option value="Received">Received</option>
                    <option value="Paid Adjustment">Paid Adjustment</option>
                    <option value="Receive Adjustment">Receive Adjustment</option>
                    <option value="Commission">Commission</option>
                  </Select>
                </div>
                <div>
                  <span className="block text-[11px] font-bold text-slate-800 mb-1">From</span>
                  <Input type="date" value={histFrom} onChange={(e) => setHistFrom(e.target.value)} className="w-auto font-bold text-slate-900 text-xs" />
                </div>
                <div>
                  <span className="block text-[11px] font-bold text-slate-800 mb-1">To</span>
                  <Input type="date" value={histTo} onChange={(e) => setHistTo(e.target.value)} className="w-auto font-bold text-slate-900 text-xs" />
                </div>
                <Button size="sm" variant="primary" onClick={() => loadLedgerHistory(histFrom, histTo, histParty, histType)}>
                  Show
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

              {!loadingHistory && historyRows.length > 0 && (
                <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                    <span className="font-extrabold text-slate-800">
                      Total Diye: <span className="text-rose-600">{formatCurrency(historyTotals.paid)}</span>
                    </span>
                    <span className="font-extrabold text-slate-800">
                      Total Liye: <span className="text-emerald-600">{formatCurrency(historyTotals.recv)}</span>
                    </span>
                  </div>
                  <Button size="sm" variant="outline" onClick={handlePrintHistory} leftIcon={<Printer className="h-3.5 w-3.5" />}>
                    Print
                  </Button>
                </div>
              )}
            </CardContent>
            <div className="px-6 pb-4 pt-1 text-xs font-bold text-rose-700">
              Ctrl+T : Focus Type For History
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
