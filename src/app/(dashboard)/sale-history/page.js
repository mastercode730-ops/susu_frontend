'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, Search, Copy, Plus, X, ArrowLeft, Clock, Calendar } from 'lucide-react';
import { API } from '../../../utils/api';
import { showToast } from '../../../utils/toast';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, StatCard } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { DataTable } from '../../../components/tables/DataTable';
import { LoadingSpinner } from '../../../components/ui/spinner';
import { Badge } from '../../../components/ui/badge';
import { formatCurrency } from '../../../lib/utils';

function toApiDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const day = String(d.getDate()).padStart(2, '0');
  const month = M[d.getMonth()];
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export default function SaleHistoryPage() {
  const router = useRouter();

  const [searchNumber, setSearchNumber] = useState('');
  const [searchAmount, setSearchAmount] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [searchMessage, setSearchMessage] = useState('');

  const [composerRows, setComposerRows] = useState([]);
  const [composerTotal, setComposerTotal] = useState(0);
  const [composerCopiedText, setComposerCopiedText] = useState('');

  const [saleRecords, setSaleRecords] = useState([]);
  const [saleTotal, setSaleTotal] = useState(0);
  const [loadingRecords, setLoadingRecords] = useState(false);

  const [showChatPanel, setShowChatPanel] = useState(false);
  const [selectedChatParams, setSelectedChatParams] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [chatDate, setChatDate] = useState('');
  const [chatGrandTotal, setChatGrandTotal] = useState(0);

  const searchNumberRef = useRef(null);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setSearchDate(today);
    setChatDate(today);
  }, []);

  const handleAddToComposer = () => {
    const s1 = searchNumber.trim();
    const s2 = searchAmount.trim();
    if (!s1) return;

    const allSame = (s) => s.split('').every((c) => c === s[0]);
    const num = s1.replace(/[^0-9]/g, '');

    const addRow = (n, a) => {
      const valNum = parseInt(n);
      const valAmt = parseFloat(a);
      if (isNaN(valNum) || isNaN(valAmt) || valAmt <= 0) return;
      if (valNum <= 0 || valNum > 100) {
        if (!(n.length >= 3 && allSame(n)) && n !== '1000' && n !== '10000') {
          return;
        }
      }
      setComposerRows((prev) => {
        const rows = [...prev, { number: n, amount: valAmt }];
        const t = rows.reduce((s, r) => s + r.amount, 0);
        setComposerTotal(t);
        return rows;
      });
    };

    if (s2 !== '' && s2 !== '0') {
      if (num.length === 1) {
        addRow('0' + num, s2);
      } else if (num.length === 3 && allSame(num)) {
        addRow(num === '000' ? '1000' : num, s2);
      } else if (num.length === 4 && allSame(num)) {
        addRow(num === '0000' ? '10000' : num, s2);
      } else if (num.length % 2 === 0) {
        let str = num;
        const chunks = [];
        while (str) {
          if (str.length < 2) {
            chunks.push(str);
            break;
          }
          chunks.push(str.substr(0, 2));
          str = str.substr(2);
        }
        chunks.forEach((chunk) => addRow(chunk === '00' ? '100' : chunk, s2));
      } else {
        showToast('Invalid values entered', 'error');
        return;
      }
      setSearchNumber('');
      setSearchAmount('');
    } else if (s2 === '0' && s1 !== '0') {
      s1.split(/[)*\-.+,$#@\\_]/).forEach((part) => {
        const mn = part.split(/[(=]/);
        if (mn[0] && mn[1]) {
          const digits = mn[0].replace(/[^0-9]/g, '');
          if ((digits.length === 3 || digits.length === 4) && allSame(digits)) {
            addRow(digits, mn[1]);
          } else {
            addRow(digits.length === 1 ? '0' + digits : digits, mn[1]);
          }
        }
      });
      setSearchNumber('');
      setSearchAmount('');
    }
  };

  const handleRemoveFromComposer = (idx) => {
    setComposerRows((prev) => {
      const rows = prev.filter((_, i) => i !== idx);
      const t = rows.reduce((s, r) => s + r.amount, 0);
      setComposerTotal(t);
      return rows;
    });
  };

  const handleCopyMessage = () => {
    const text = composerRows.map((r) => `${r.number}=${r.amount}`).join(',');
    setComposerCopiedText(text);
    setSearchMessage(text);
    showToast('Copied to search query!');
  };

  const handleSearchHistory = async () => {
    if (!searchMessage.trim()) {
      showToast('Please enter search query', 'error');
      return;
    }
    setLoadingRecords(true);
    setSaleRecords([]);
    setSaleTotal(0);

    const apiDate = toApiDate(searchDate);
    try {
      const r = await API.get(
        `/sapi/hisab/sale-history?date=${apiDate}&filter=${encodeURIComponent(searchMessage.trim())}`
      );
      if (r && r.success) {
        const data = r.data || [];
        setSaleRecords(data);
        const total = data.reduce((s, row) => s + (parseFloat(row.TotalAmount) || 0), 0);
        setSaleTotal(total);
      }
    } catch (e) {
      console.error(e);
      showToast('Error loading search results', 'error');
    } finally {
      setLoadingRecords(false);
    }
  };

  const handleOpenChatPanel = async (row) => {
    const mob = row.Mobile || row.MobileNo || row.CMobile || '';
    setLoadingChat(true);
    setShowChatPanel(true);

    try {
      const uRes = mob ? await API.get(`/sapi/home/user-by-mobile/${mob}`) : null;
      const realUID = uRes?.data?.[0]?.UID || row.fSenderID || row.fUID || '';

      const chatParams = {
        mobile: mob,
        customerName: row.CustomerName || mob,
        gameId: row.fGameID || row.GID || '',
        gameName: row.GameName || '',
        selUID: realUID,
        rates: row.Rate || row.Rates || '0/100-0/10-0',
      };

      setSelectedChatParams(chatParams);
      await loadChatHistory(chatParams, searchDate);
    } catch (e) {
      console.error(e);
      showToast('Error opening chat panel', 'error');
    } finally {
      setLoadingChat(false);
    }
  };

  const loadChatHistory = async (params, dateVal) => {
    if (!params) return;
    const apiDate = toApiDate(dateVal);
    try {
      const r = await API.get(
        `/sapi/chat/received?gameId=${params.gameId}&date=${encodeURIComponent(apiDate)}&selectedUID=${params.selUID}&rates=${encodeURIComponent(params.rates)}`
      );
      if (r && r.success) {
        const msgs = r.data || [];
        setChatMessages(msgs);
        const tot = msgs
          .filter((m) => m.IsAccepted === 'Accepted' || m.IsAccepted === 'Pending')
          .reduce((s, m) => s + (parseFloat(m.TotalAmount) || 0), 0);
        setChatGrandTotal(tot);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const columns = [
    {
      header: 'Customer',
      accessorKey: 'CustomerName',
      cell: ({ row }) => (
        <button
          onClick={() => handleOpenChatPanel(row.original)}
          className="font-bold text-xs text-blue-600 hover:underline capitalize"
        >
          {row.original.CustomerName || row.original.Mobile || row.original.CMobile}
        </button>
      ),
    },
    {
      header: 'Game',
      accessorKey: 'GameName',
      cell: ({ row }) => <span className="text-xs font-semibold">{row.original.GameName || '-'}</span>,
    },
    {
      header: 'Rate',
      accessorKey: 'Rate',
      cell: ({ row }) => <span className="text-xs text-slate-500 font-mono">{row.original.Rate || '-'}</span>,
    },
    {
      header: 'SubUser',
      accessorKey: 'subuserID',
      cell: ({ row }) => <span className="text-xs font-semibold">{row.original.subuserID || '-'}</span>,
    },
    {
      header: 'Total Sale',
      accessorKey: 'TotalAmount',
      cell: ({ row }) => (
        <span className="font-bold text-xs text-slate-900">
          {formatCurrency(parseFloat(row.original.TotalAmount) || 0)}
        </span>
      ),
    },
    {
      header: 'Message Payload',
      accessorKey: 'Message',
      cell: ({ row }) => <span className="text-xs font-mono text-slate-600">{row.original.Message || '-'}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Find Chat & Sale History"
        description="Search past bet submissions, inspect chat records, and build multi-number queries."
      />

      {!showChatPanel ? (
        <div className="grid grid-cols-1 gap-6">
          {/* Query Composer Card */}
          <Card>
            <CardHeader>
              <CardTitle>Query Composer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <Input
                  label="Number"
                  placeholder="e.g. 54"
                  value={searchNumber}
                  onChange={(e) => setSearchNumber(e.target.value.replace(/[^0-9]/g, ''))}
                  ref={searchNumberRef}
                />
                <Input
                  label="Amount"
                  placeholder="e.g. 100"
                  value={searchAmount}
                  onChange={(e) => setSearchAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                />
                <div className="flex items-center gap-2">
                  <Button onClick={handleAddToComposer} leftIcon={<Plus className="h-4 w-4" />}>
                    Add
                  </Button>
                  <Button variant="outline" onClick={handleCopyMessage} leftIcon={<Copy className="h-4 w-4" />}>
                    Copy Query
                  </Button>
                </div>
              </div>

              {composerRows.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {composerRows.map((r, i) => (
                      <Badge key={i} variant="primary" className="gap-2 px-3 py-1">
                        <span>{r.number} = {formatCurrency(r.amount)}</span>
                        <button onClick={() => handleRemoveFromComposer(i)}>
                          <X className="h-3 w-3 hover:text-red-500" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="text-xs font-bold text-slate-700">
                    Total Composer Amount: {formatCurrency(composerTotal)}
                  </div>
                </div>
              )}

              {/* Main Search Controls */}
              <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <Input label="Date" type="date" value={searchDate} onChange={(e) => setSearchDate(e.target.value)} />
                <Input
                  label="Search Query Payload"
                  placeholder="Enter message to search (e.g. 54=100)"
                  value={searchMessage}
                  onChange={(e) => setSearchMessage(e.target.value)}
                />
                <Button onClick={handleSearchHistory} isLoading={loadingRecords} leftIcon={<Search className="h-4 w-4" />}>
                  SEARCH CHAT
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results Table Card */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <CardTitle>Matching Chat Records ({saleRecords.length})</CardTitle>
              <div className="text-sm font-bold text-slate-900">
                Total Match Sale: {formatCurrency(saleTotal)}
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={columns}
                data={saleRecords}
                isLoading={loadingRecords}
                searchPlaceholder="Filter results..."
              />
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Chat Panel View */
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
            <div className="flex items-center gap-3 min-w-0">
              <Button variant="ghost" size="icon-sm" onClick={() => setShowChatPanel(false)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-0">
                <CardTitle className="truncate">{selectedChatParams?.customerName} — {selectedChatParams?.gameName}</CardTitle>
                <p className="text-xs text-slate-500 font-mono truncate">Rates: {selectedChatParams?.rates}</p>
              </div>
            </div>
            <Input
              type="date"
              value={chatDate}
              onChange={(e) => {
                setChatDate(e.target.value);
                loadChatHistory(selectedChatParams, e.target.value);
              }}
              className="w-auto shrink-0"
            />
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {loadingChat ? (
              <LoadingSpinner text="Fetching chat transcript..." />
            ) : chatMessages.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-8">No chat messages found for this date.</p>
            ) : (
              <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2">
                {chatMessages.map((m, idx) => {
                  const isSent = String(m.Sender) === '0';
                  return (
                    <div
                      key={idx}
                      className={`flex flex-col max-w-[80%] rounded-2xl p-4 text-xs font-mono shadow-xs ${
                        isSent
                          ? 'ml-auto bg-blue-600 text-white'
                          : 'mr-auto bg-slate-100 text-slate-900'
                      }`}
                    >
                      <div className="font-bold whitespace-pre-wrap">{m.Message}</div>
                      {m.TotalAmount && (
                        <div className="mt-2 pt-1 border-t border-white/20 text-[11px] opacity-90 font-semibold">
                          Total: {formatCurrency(parseFloat(m.TotalAmount))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {chatGrandTotal > 0 && (
              <div className="rounded-xl bg-slate-100 p-3 text-center text-xs font-bold">
                Grand Total Accepted Bets: {formatCurrency(chatGrandTotal)}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
