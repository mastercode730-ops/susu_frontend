'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MessageSquare, Send, Copy, Trash2, Edit2, CheckCircle2, XCircle, Clock, Calendar, MoveRight } from 'lucide-react';
import { API } from '../../../utils/api';
import { showToast } from '../../../utils/toast';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
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

function ChatWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const gameId = searchParams.get('GameId') || '';
  const gameName = searchParams.get('GameName') || '';
  const mobile = searchParams.get('SelectedMobile') || '';
  const selUID = searchParams.get('SelectedUID') || '';
  const rates = searchParams.get('Rates') || '0/100-0/10-0';

  const [currentUser, setCurrentUser] = useState(null);
  const [customerNameText, setCustomerNameText] = useState(mobile);
  const [currentDate, setCurrentDate] = useState('');
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [grandTotal, setGrandTotal] = useState(0);

  const [txtMessage, setTxtMessage] = useState('');
  const [txtMessageAmount, setTxtMessageAmount] = useState('');
  const [typedRows, setTypedRows] = useState([]);
  const messageEndRef = useRef(null);

  useEffect(() => {
    fetchSessionUser();
  }, []);

  const fetchSessionUser = async () => {
    try {
      const r = await API.get('/sapi/auth/me');
      if (r && r.user) {
        setCurrentUser(r.user);
        const today = new Date().toISOString().split('T')[0];
        const apiD = toApiDate(today);
        setCurrentDate(apiD);
        fetchChatMessages(gameId, apiD, selUID, rates);
      }
    } catch (e) {
      console.error(e);
      router.push('/login');
    }
  };

  const fetchChatMessages = async (gId, dStr, cId, rts) => {
    if (!gId || !dStr || !cId) return;
    setLoadingMessages(true);
    try {
      const r = await API.get(`/sapi/chat/received?gameId=${gId}&date=${encodeURIComponent(dStr)}&selectedUID=${cId}&rates=${encodeURIComponent(rts)}`);
      if (r && r.success) {
        const list = r.data || [];
        setMessages(list);
        const tot = list
          .filter((m) => m.IsAccepted === 'Accepted' || m.IsAccepted === 'Pending')
          .reduce((sum, m) => sum + (parseFloat(m.TotalAmount) || 0), 0);
        setGrandTotal(Math.round(tot));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleAddBetRow = () => {
    if (!txtMessage.trim() || !txtMessageAmount.trim()) return;
    const num = txtMessage.trim();
    const amt = parseFloat(txtMessageAmount) || 0;
    if (amt <= 0) return;

    setTypedRows((prev) => [...prev, { num, amt }]);
    setTxtMessage('');
    setTxtMessageAmount('');
  };

  const submitTypedAssignments = async () => {
    if (typedRows.length === 0) return;
    const finalMsgStr = typedRows.map((r) => `${r.num}=${r.amt}`).join(',');
    const finalTotalAmt = typedRows.reduce((s, r) => s + r.amt, 0);

    try {
      const r = await API.post('/sapi/chat/save-receiver-message', {
        message: finalMsgStr,
        totalAmount: finalTotalAmt,
        gameID: gameId,
        date: currentDate,
        customerUID: selUID,
      });

      if (r && r.success) {
        showToast('Bet placed successfully!');
        setTypedRows([]);
        fetchChatMessages(gameId, currentDate, selUID, rates);
      } else {
        showToast(r?.message || 'Error saving message', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Error saving bet details', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title={`${gameName} Live Chat Terminal`}
        description={`Customer: ${mobile} (${rates})`}
        actions={
          <Input
            type="date"
            value={toInputDate(currentDate)}
            onChange={(e) => {
              const apiD = toApiDate(e.target.value);
              setCurrentDate(apiD);
              fetchChatMessages(gameId, apiD, selUID, rates);
            }}
            className="w-auto"
          />
        }
      />

      <Card className="h-[550px] flex flex-col justify-between overflow-hidden">
        {/* Messages Feed */}
        <CardContent className="p-4 flex-1 overflow-y-auto space-y-3">
          {loadingMessages ? (
            <LoadingSpinner text="Fetching chat thread..." />
          ) : messages.length === 0 ? (
            <p className="text-center text-xs text-slate-500 py-12">No messages for this draw date.</p>
          ) : (
            messages.map((m, idx) => {
              const isSent = String(m.Sender) === '0';
              return (
                <div
                  key={idx}
                  className={`flex flex-col max-w-[75%] rounded-2xl p-4 text-xs font-mono shadow-xs ${
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
            })
          )}
          <div ref={messageEndRef} />
        </CardContent>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 space-y-3">
          {typedRows.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {typedRows.map((r, i) => (
                <Badge key={i} variant="primary" className="px-3 py-1">
                  {r.num} = {formatCurrency(r.amt)}
                </Badge>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <Input placeholder="Number (e.g. 54)" value={txtMessage} onChange={(e) => setTxtMessage(e.target.value)} />
            <Input placeholder="Amount (e.g. 100)" value={txtMessageAmount} onChange={(e) => setTxtMessageAmount(e.target.value)} />
            <Button variant="outline" onClick={handleAddBetRow}>
              Add Bet
            </Button>
            <Button onClick={submitTypedAssignments} leftIcon={<Send className="h-4 w-4" />}>
              SEND (F2)
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<LoadingSpinner text="Loading Chat workspace..." />}>
      <ChatWorkspace />
    </Suspense>
  );
}
