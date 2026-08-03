'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { API } from '../../../utils/api';
import { showToast } from '../../../utils/toast';

// 100 numbers grid structures for Yantri modal
const DARA_NUMS = Array.from({ length: 100 }, (_, i) => i + 1);
const AKHAR_AADAR = [111, 222, 333, 444, 555, 666, 777, 888, 999, 1000];
const AKHAR_ANDER = [1111, 2222, 3333, 4444, 5555, 6666, 7777, 8888, 9999, 10000];
const ALL_NUMS = [...DARA_NUMS, ...AKHAR_AADAR, ...AKHAR_ANDER];

const JODE_NUMS = ['11', '22', '33', '44', '55', '66', '77', '88', '99', '100'];
const SET57 = ['21', '23', '24', '26', '27', '28', '29', '31', '32', '34', '36', '37', '38', '39', '41', '42', '43', '46', '47', '48', '49', '51', '52', '53', '54', '56', '57', '58', '59', '61', '62', '63', '64', '67', '68', '69', '71', '72', '73', '74', '76', '78', '79', '81', '82', '83', '84', '86', '87', '89', '91', '92', '93', '94', '96', '97', '98'];
const SET43 = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '22', '25', '30', '33', '35', '40', '44', '45', '50', '55', '60', '65', '66', '70', '75', '77', '80', '85', '88', '90', '95', '99', '100'];

function ChatWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Search parameters parsing (with default values matching ASPX specs)
  const gameId = searchParams.get('GameId') || '';
  const gameName = searchParams.get('GameName') || '';
  const mobile = searchParams.get('SelectedMobile') || '';
  const selUID = searchParams.get('SelectedUID') || '';
  const rates = searchParams.get('Rates') || '0/100-0/10-0';
  
  const dPComm = searchParams.get('D_PComm') || '0';
  const dAmt = searchParams.get('D_Amt') || '100';
  const aPComm = searchParams.get('A_PComm') || '0';
  const aAmt = searchParams.get('A_Amt') || '10';
  const pati = searchParams.get('Pati_PComm') || '0';
  const hissaID = searchParams.get('ThirdPartyHissaID') || '0';
  const hissaPer = searchParams.get('ThirdPartyHissaPer') || '0';
  const tpCommID = searchParams.get('ThirdPartyCommID') || '0';
  const tpDara = searchParams.get('ThirdPartyDaraComm') || '0';
  const tpAkhar = searchParams.get('ThirdPartyAkharComm') || '0';
  const selPage = searchParams.get('SelectedPage') || '1';
  const lastDate = searchParams.get('LastMsgDate') || '';
  const rateID = searchParams.get('RateID') || '';

  // App Session
  const [currentUser, setCurrentUser] = useState(null);
  const [isStaff, setIsStaff] = useState(false);
  const [customerNameText, setCustomerNameText] = useState(mobile);
  const [userBalanceText, setUserBalanceText] = useState('');
  const [isUttarCustomer, setIsUttarCustomer] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState('False');

  // Chat Log dates
  const [todaysDate, setTodaysDate] = useState('');
  const [currentDate, setCurrentDate] = useState('');

  // Messages log
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [grandTotal, setGrandTotal] = useState(0);

  // Keyboard/Input row modes: typing, laddi, jode, crossing, pahada, ander, bahar, yantri, 57, 43, palat, chat
  const [pillMode, setPillMode] = useState('typing'); // typing, laddi, jode, crossing, pahada, ander, bahar, yantri, 57, 43, palat, chat
  const [crossingWithoutJode, setCrossingWithoutJode] = useState(false);
  const [add3Pahada, setAdd3Pahada] = useState(false);

  // Input fields state
  const [txtMessage, setTxtMessage] = useState('');
  const [txtSecondNumber, setTxtSecondNumber] = useState('');
  const [txtMessageAmount, setTxtMessageAmount] = useState('');
  const [txtMessageAmountPalat, setTxtMessageAmountPalat] = useState('');
  const [txtonlyTextMessage, setTxtonlyTextMessage] = useState('');

  // Active typed list builder
  const [typedRows, setTypedRows] = useState([]);
  const [typedTotal, setTypedTotal] = useState(0);

  // Edit Mode state
  const [editModeActive, setEditModeActive] = useState(false);
  const [editChatId, setEditChatId] = useState('');

  // Bulk Move/Copy Share Modal
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkDate, setBulkDate] = useState('');
  const [bulkGameList, setBulkGameList] = useState([]);
  const [selectedBulkGameId, setSelectedBulkGameId] = useState('');
  const [bulkCustomerList, setBulkCustomerList] = useState([]);
  const [filteredBulkCustomers, setFilteredBulkCustomers] = useState([]);
  const [selectedBulkCustId, setSelectedBulkCustId] = useState('');
  const [bulkCustSearchText, setBulkCustSearchText] = useState('');
  const [bulkRatesList, setBulkRatesList] = useState([]);
  const [selectedBulkRateId, setSelectedBulkRateId] = useState('');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  // Yantri modal grid input
  const [showYantriModal, setShowYantriModal] = useState(false);
  const [yantriUpToDown, setYantriUpToDown] = useState(true);
  const [yantriValues, setYantriValues] = useState(() => {
    const vals = {};
    ALL_NUMS.forEach(n => vals[n] = '');
    return vals;
  });
  const [yantriTotal, setYantriTotal] = useState(0);

  // Refs
  const messageEndRef = useRef(null);
  const txtMessageRef = useRef(null);

  // Initialize
  useEffect(() => {
    fetchSessionUser();
  }, []);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Prevent browser default behavior for F keys
      if (e.key === 'F2') {
        e.preventDefault();
        btnSendClick();
      } else if (e.key === 'F4') {
        e.preventDefault();
        handlePillClick('laddi');
      } else if (e.key === 'F5') {
        e.preventDefault();
        handleClearTable();
      } else if (e.key === 'F8') {
        e.preventDefault();
        handlePillClick('jode');
      } else if (e.key === 'F9') {
        e.preventDefault();
        handlePillClick('crossing');
      } else if (e.key === 'End') {
        e.preventDefault();
        handlePillClick('yantri');
      } else if (e.key === 'Home') {
        e.preventDefault();
        handlePillClick('typing');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [txtMessage, txtSecondNumber, txtMessageAmount, txtMessageAmountPalat, txtonlyTextMessage, typedRows, pillMode, crossingWithoutJode, add3Pahada, editModeActive, editChatId]);

  // Refresh interval loop
  useEffect(() => {
    let interval;
    if (refreshStatus === 'True' && gameId && currentDate && selUID) {
      interval = setInterval(() => {
        fetchChatMessages(gameId, currentDate, selUID, rates);
      }, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [refreshStatus, gameId, currentDate, selUID, rates]);

  // Scroll to bottom on messages load
  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const fetchSessionUser = async () => {
    try {
      const r = await API.get('/api/auth/me');
      if (r && r.user) {
        setCurrentUser(r.user);
        setIsStaff(!!r.user.SubUID);
        setRefreshStatus(r.user.IsRefreshStatus || 'False');
        
        await loadCustomerName();
        await fetchUserBalance();
        await initDates();
      }
    } catch (e) {
      console.error(e);
      router.push('/login');
    }
  };

  const loadCustomerName = async () => {
    try {
      const r = await API.get(`/api/chat/customer-name?mobile=${mobile}`);
      const mobno = mobile.length > 5 ? mobile.substring(mobile.length - 5) : mobile;
      if (r && r.success && r.data?.CustomerName) {
        setCustomerNameText(`${r.data.CustomerName} (${mobno})`);
        setIsUttarCustomer(r.data.IsUttar === 'True' || r.data.IsUttar === true);
      } else {
        setCustomerNameText(mobile);
      }
    } catch (e) {
      setCustomerNameText(mobile);
    }
  };

  const fetchUserBalance = async () => {
    try {
      const r = await API.get(`/api/accounts/selected-balance?customerUID=${selUID}`);
      if (r && r.success && r.data?.IsLimit === 'True') {
        const bal = Math.trunc(parseFloat(r.data.WinAmount || 0));
        if (bal > 0) {
          setUserBalanceText(`Bal : ${bal}`);
        } else if (bal < 0) {
          setUserBalanceText(`Bal : ${Math.abs(bal)}`);
        } else {
          setUserBalanceText('');
        }
      } else {
        setUserBalanceText('');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const initDates = async () => {
    let todayFmt = new Date().toLocaleDateString('en-GB'); // dd/mm/yyyy fallback
    let currentFmt = '';

    try {
      const r = await API.get(`/api/chat/date?gameId=${gameId}`);
      if (r && r.date) {
        todayFmt = r.date;
      }
    } catch (e) {
      console.error(e);
    }

    currentFmt = todayFmt;
    setTodaysDate(todayFmt);

    // Unread date override
    try {
      const r2 = await API.get(`/api/chat/unread-date?gameId=${gameId}&selectedUID=${selUID}`);
      if (r2 && r2.date && r2.date !== todayFmt) {
        currentFmt = r2.date;
      }
    } catch (e) {
      console.error(e);
    }

    // URL lastDate override
    if (lastDate && gameName !== 'DS') {
      currentFmt = lastDate;
    }

    setCurrentDate(currentFmt);
    await fetchChatMessages(gameId, currentFmt, selUID, rates);
  };

  const fetchChatMessages = async (gId, dStr, cId, rts) => {
    if (!gId || !dStr || !cId) return;
    try {
      const r = await API.get(`/api/chat/received?gameId=${gId}&date=${encodeURIComponent(dStr)}&selectedUID=${cId}&rates=${encodeURIComponent(rts)}`);
      if (r && r.success) {
        const list = r.data || [];
        setMessages(list);

        // Compute Grand Total (Accepted + Pending active bets)
        const tot = list
          .filter(m => m.IsAccepted === 'Accepted' || m.IsAccepted === 'Pending')
          .reduce((sum, m) => {
            let pSum = 0;
            (m.Message || '').split(',').forEach(e => {
              const parts = e.split('=');
              if (parts.length === 2) pSum += parseFloat(parts[1]) || 0;
            });
            return sum + (pSum > 0 ? pSum : (parseFloat(m.TotalAmount) || 0));
          }, 0);
        
        setGrandTotal(Math.round(tot));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDateChange = (val) => {
    const inputD = toInputDate(val);
    const apiD = toApiDate(inputD);
    setCurrentDate(apiD);
    handleClearTable();
    fetchChatMessages(gameId, apiD, selUID, rates);
  };

  // Nav pill triggers
  const handlePillClick = (mode) => {
    setPillMode(mode);
    setCrossingWithoutJode(false);
    setAdd3Pahada(false);
    
    // Manage input focus and field visibility
    if (mode === 'yantri') {
      setShowYantriModal(true);
      ymClear();
    } else {
      // Focus txtMessage input element
      setTimeout(() => {
        if (txtMessageRef.current) txtMessageRef.current.focus();
      }, 50);
    }
  };

  // Chat logic - Save F2 click
  const btnSendClick = () => {
    if (pillMode === 'chat') {
      sendPlainMessage();
    } else {
      if (typedRows.length > 0) {
        submitTypedAssignments();
      } else {
        // Trigger parsing from input fields directly
        processSaveBulkMessage(txtMessage, txtMessageAmount);
      }
    }
  };

  const sendPlainMessage = async () => {
    const text = txtonlyTextMessage.trim();
    if (!text) return;

    try {
      const r = await API.post('/api/chat/send', {
        message: text,
        isTextChat: 'True',
        gameID: gameId,
        date: currentDate,
        customerUID: selUID,
        subUserID: isStaff ? currentUser.SubUID : '0'
      });

      if (r && r.success) {
        setTxtonlyTextMessage('');
        await fetchChatMessages(gameId, currentDate, selUID, rates);
      } else {
        showToast(r?.message || 'Error sending message', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Connection error sending plain message', 'error');
    }
  };

  // Parse and build rows from input fields
  const processSaveBulkMessage = (txtNumber, txtAmount) => {
    const s1 = txtNumber.trim();
    const s2 = txtAmount.trim();

    if (!s1 && pillMode !== 'jode' && pillMode !== '57' && pillMode !== '43') return;

    const nextRows = [...typedRows];
    const addRowItem = (num, amt) => {
      const val = parseInt(num);
      const isNumValid = (val > 0 && val <= 100) || (num.length >= 3 && num.split('').every(c => c === num[0])) || num === '1000' || num === '10000';
      if (!isNumValid) return;

      const numericAmt = parseFloat(amt) || 0;
      if (numericAmt === 0) return;

      const finalAmt = isUttarCustomer ? -Math.abs(numericAmt) : Math.abs(numericAmt);
      nextRows.push({ num, amt: finalAmt });
    };

    if (pillMode === 'jode') {
      JODE_NUMS.forEach(n => addRowItem(n, s2));
    } else if (pillMode === '57') {
      SET57.forEach(n => addRowItem(n, s2));
    } else if (pillMode === '43') {
      SET43.forEach(n => addRowItem(n, s2));
    } else if (pillMode === 'palat') {
      const s3 = txtMessageAmountPalat.trim();
      const raw = s1.replace(/[^0-9]/g, '');
      if (raw.length === 1) {
        addRowItem('0' + raw, s2);
        addRowItem(raw + '0', s3);
      } else if (raw.length % 2 === 0) {
        for (let i = 0; i < raw.length; i += 2) {
          let c = raw.substr(i, 2);
          if (c === '00') c = '100';
          addRowItem(c, s2);
          const rev = parseInt(c.split('').reverse().join(''));
          addRowItem(rev < 10 ? '0' + rev : String(rev), s3);
        }
      } else {
        showToast('Invalid number digits for palat', 'error');
        return;
      }
    } else if (pillMode === 'pahada') {
      let start = parseInt(s1.replace(/[^0-9]/g, ''));
      if (isNaN(start) || start <= 0) start = 1;
      const step = add3Pahada ? 3 : start;
      for (let i = start; i <= 100; i += step) {
        const Tstr = i >= 1 && i <= 9 ? '0' + i : String(i);
        addRowItem(Tstr, s2);
      }
    } else if (pillMode === 'ander') {
      s1.replace(/[^0-9]/g, '').split('').forEach(d => {
        let n = d + d + d + d;
        if (n === '0000') n = '10000';
        addRowItem(n, s2);
      });
    } else if (pillMode === 'bahar') {
      s1.replace(/[^0-9]/g, '').split('').forEach(d => {
        let n = d + d + d;
        if (n === '000') n = '1000';
        addRowItem(n, s2);
      });
    } else if (pillMode === 'laddi') {
      const from = parseInt(s1.replace(/[^0-9]/g, ''));
      const to = parseInt(txtSecondNumber.replace(/[^0-9]/g, ''));
      const amt = parseFloat(s2);
      if (!isNaN(from) && !isNaN(to) && amt > 0 && from >= 1 && from < to && to <= 100) {
        for (let i = from; i <= to; i++) {
          addRowItem(i <= 9 ? '0' + i : String(i), s2);
        }
      } else {
        showToast('Invalid range or amount', 'error');
        return;
      }
    } else if (pillMode === 'crossing') {
      const digits = s1.replace(/[^0-9]/g, '').split('');
      for (let i = 0; i < digits.length; i++) {
        for (let j = 0; j < digits.length; j++) {
          if (crossingWithoutJode && i === j) continue;
          let pair = digits[i] + digits[j];
          if (pair === '00' || pair === '0') pair = '100';
          addRowItem(pair, s2);
        }
      }
    } else {
      // Default Typing input (numbers parsed side by side)
      const digitsOnly = s1.replace(/[^0-9]/g, '');
      if (digitsOnly) {
        if (digitsOnly.length === 1) {
          const v = parseInt(digitsOnly);
          addRowItem(v >= 1 && v <= 9 ? '0' + v : v === 0 ? '100' : String(v), s2);
        } else if (digitsOnly.length === 3 && digitsOnly.split('').every(c => c === digitsOnly[0])) {
          addRowItem(digitsOnly === '000' ? '1000' : digitsOnly, s2);
        } else if (digitsOnly.length === 4 && digitsOnly.split('').every(c => c === digitsOnly[0])) {
          addRowItem(digitsOnly === '0000' ? '10000' : digitsOnly, s2);
        } else if (digitsOnly.length % 2 === 0) {
          for (let i = 0; i < digitsOnly.length; i += 2) {
            let c = digitsOnly.substr(i, 2);
            if (c === '00') c = '100';
            addRowItem(c, s2);
          }
        } else {
          const v = parseInt(digitsOnly);
          addRowItem(v >= 1 && v <= 9 ? '0' + v : String(v), s2);
        }
      }
    }

    setTypedRows(nextRows);
    const sumTotal = nextRows.reduce((s, r) => s + r.amt, 0);
    setTypedTotal(sumTotal);

    // Clear fields but preserve Pahada checkboxes
    setTxtMessage('');
    setTxtSecondNumber('');
    setTxtMessageAmount('');
    setTxtMessageAmountPalat('');

    if (pillMode !== 'pahada') {
      setCrossingWithoutJode(false);
      setAdd3Pahada(false);
      setPillMode('typing');
    }
  };

  const handleDeleteRow = (idx) => {
    const updated = typedRows.filter((_, i) => i !== idx);
    setTypedRows(updated);
    setTypedTotal(updated.reduce((s, r) => s + r.amt, 0));
  };

  const handleClearTable = () => {
    setTypedRows([]);
    setTypedTotal(0);
    setTxtMessage('');
    setTxtSecondNumber('');
    setTxtMessageAmount('');
    setTxtMessageAmountPalat('');
    setTxtonlyTextMessage('');
    setEditModeActive(false);
    setEditChatId('');
    setPillMode('typing');
  };

  const submitTypedAssignments = async () => {
    const finalMsgStr = typedRows.map(r => `${r.num}=${r.amt}`).join(',');
    const finalTotalAmt = typedRows.reduce((s, r) => s + Math.abs(r.amt), 0);

    setLoading(true);
    try {
      let r;
      if (editModeActive && editChatId) {
        // Edit update request
        r = await API.put('/api/chat/update', {
          chatId: editChatId,
          message: finalMsgStr,
          totalAmount: finalTotalAmt
        });
      } else {
        // New insert request
        r = await API.post('/api/chat/save-receiver-message', {
          message: finalMsgStr,
          totalAmount: finalTotalAmt,
          gameID: gameId,
          date: currentDate,
          customerUID: selUID,
          subUserID: isStaff ? currentUser.SubUID : '0',
          D_PComm: dPComm,
          D_Amt: dAmt,
          A_PComm: aPComm,
          A_Amt: aAmt,
          Pati: pati,
          ThirdPartyHissaID: hissaID,
          ThirdPartyHissaPer: hissaPer,
          ThirdPartyCommID: tpCommID,
          ThirdPartyDaraComm: tpDara,
          ThirdPartyAkharComm: tpAkhar,
          rateID: rateID
        });
      }

      if (r && r.success) {
        showToast(editModeActive ? 'Updated successfully!' : 'Saved successfully!');
        handleClearTable();
        await Promise.all([fetchChatMessages(gameId, currentDate, selUID, rates), fetchUserBalance()]);
      } else {
        showToast(r?.message || 'Error saving message', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Error saving chat bet details', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Re-submit single message item into typing editing workspace
  const handleEditMessage = (row) => {
    setEditModeActive(true);
    setEditChatId(row.ChatID);
    
    // Parse message parts into table rows
    const parts = (row.Message || '').split(',');
    const parsed = [];
    parts.forEach(p => {
      const segs = p.split('=');
      if (segs.length === 2) {
        parsed.push({ num: segs[0], amt: parseFloat(segs[1]) || 0 });
      }
    });

    setTypedRows(parsed);
    setTypedTotal(parsed.reduce((s, r) => s + r.amt, 0));
    setPillMode('typing');
  };

  const handleAcceptStatus = async (chatId, status) => {
    try {
      const r = await API.post('/api/chat/accept-reject', { chatId, status });
      if (r && r.success) {
        showToast(`Status updated to ${status}`);
        await Promise.all([fetchChatMessages(gameId, currentDate, selUID, rates), fetchUserBalance()]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteChatMsg = async (chatId) => {
    if (!confirm('Do you want to Delete this pending bet?')) return;
    try {
      const r = await API.delete(`/api/chat/${chatId}`);
      if (r && r.success) {
        showToast('Message Deleted successfully!');
        await Promise.all([fetchChatMessages(gameId, currentDate, selUID, rates), fetchUserBalance()]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyChatText = (text) => {
    if (!text) return;
    try {
      navigator.clipboard.writeText(text);
      showToast('Copied to clipboard!');
    } catch (e) {
      console.error(e);
    }
  };

  // Bulk Move/Copy Modal Dialog triggers
  const handleOpenBulkModal = async () => {
    setBulkSubmitting(false);
    setBulkCustSearchText('');
    setBulkDate(toInputDate(currentDate));
    
    try {
      const [gamesRes, custsRes] = await Promise.all([
        API.get('/api/yantri/games'),
        API.get('/api/accounts/customers')
      ]);

      if (gamesRes && gamesRes.data) {
        setBulkGameList(gamesRes.data);
        setSelectedBulkGameId(gameId);
      }

      if (custsRes && custsRes.success && custsRes.data) {
        const sorted = (custsRes.data || []).sort((a,b) => (a.Name||'').localeCompare(b.Name||''));
        setBulkCustomerList(sorted);
        setFilteredBulkCustomers(sorted);
        
        // Match current customer
        const currentCust = sorted.find(c => String(c.UID) === String(selUID));
        if (currentCust) {
          setSelectedBulkCustId(currentCust.UID);
          setBulkCustSearchText(currentCust.Name);
          fetchBulkRates(currentCust.UID);
        }
      }

      setShowBulkModal(true);

    } catch (e) {
      console.error(e);
    }
  };

  const fetchBulkRates = async (custUID) => {
    try {
      const r = await API.get(`/api/chat/rates?selectedUID=${custUID}`);
      if (r && r.data) {
        setBulkRatesList(r.data);
        if (r.data.length > 0) {
          // Pre-select matched RateID if applicable
          const matched = r.data.find(rt => String(rt.RateID) === String(rateID));
          setSelectedBulkRateId(matched ? matched.RateID : r.data[0].RateID);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleBulkCustSearch = (e) => {
    const term = e.target.value;
    setBulkCustSearchText(term);
    if (!term.trim()) {
      setFilteredBulkCustomers(bulkCustomerList);
    } else {
      setFilteredBulkCustomers(
        bulkCustomerList.filter(c => (c.Name || '').toLowerCase().includes(term.toLowerCase()))
      );
    }
  };

  const handleSelectBulkCustomer = (cust) => {
    setSelectedBulkCustId(cust.UID);
    setBulkCustSearchText(cust.Name);
    fetchBulkRates(cust.UID);
  };

  const doBulkMoveCopy = async (actionType) => {
    if (!selectedBulkGameId || !selectedBulkCustId || !selectedBulkRateId || !bulkDate) {
      showToast('Please fill target parameters', 'error');
      return;
    }

    const matchedRate = bulkRatesList.find(r => String(r.RateID) === String(selectedBulkRateId));
    if (!matchedRate) return;

    setBulkSubmitting(true);
    const endpoint = actionType === 'move' ? '/api/chat/move-message' : '/api/chat/copy-message';

    try {
      const r = await API.post(endpoint, {
        gameID: gameId,
        date: currentDate,
        customerUID: selUID,
        targetGameID: selectedBulkGameId,
        targetDate: toApiDate(bulkDate),
        targetCustomerUID: selectedBulkCustId,
        targetRateID: selectedBulkRateId,
        D_PComm: matchedRate.D_PComm || 0,
        D_Amt: matchedRate.D_Amt || 100,
        A_PComm: matchedRate.A_PComm || 0,
        A_Amt: matchedRate.A_Amt || 10,
        Pati: matchedRate.Patti || 0,
        ThirdPartyHissaID: matchedRate.ThirdPartyHissaID || 0,
        ThirdPartyHissaPer: matchedRate.ThirdPartyHissaPer || 0,
        ThirdPartyCommID: matchedRate.ThirdPartyCommID || 0,
        ThirdPartyDaraComm: matchedRate.ThirdPartyDaraComm || 0,
        ThirdPartyAkharComm: matchedRate.ThirdPartyAkharComm || 0,
        subUserID: isStaff ? currentUser.SubUID : '0'
      });

      if (r && r.success) {
        showToast(actionType === 'move' ? 'Messages Moved Successfully!' : 'Messages Copied Successfully!');
        setShowBulkModal(false);
        await Promise.all([fetchChatMessages(gameId, currentDate, selUID, rates), fetchUserBalance()]);
      } else {
        showToast(r?.message || 'Error processing request', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Error processing bulk share request', 'error');
    } finally {
      setBulkSubmitting(false);
    }
  };

  // Yantri modal grid helpers
  const ymClear = () => {
    const vals = {};
    ALL_NUMS.forEach(n => vals[n] = '');
    setYantriValues(vals);
    setYantriTotal(0);
  };

  const handleYantriCellChange = (num, val) => {
    const sanitized = val.replace(/[^0-9]/g, '');
    const updated = { ...yantriValues, [num]: sanitized };
    setYantriValues(updated);

    // Sum total
    let sum = 0;
    ALL_NUMS.forEach(n => {
      sum += parseFloat(updated[n]) || 0;
    });
    setYantriTotal(sum);
  };

  const ymSend = () => {
    const parts = [];
    ALL_NUMS.forEach(n => {
      const v = parseFloat(yantriValues[n]) || 0;
      if (v) {
        parts.push({ num: String(n), amt: v });
      }
    });

    if (parts.length === 0) {
      showToast('No Yantri inputs entered', 'error');
      return;
    }

    setTypedRows(parts);
    setTypedTotal(parts.reduce((s, r) => s + r.amt, 0));
    setShowYantriModal(false);
    setPillMode('typing');
    showToast('Yantri values imported! Press Save(F2) to submit.');
  };

  return (
    <div className="content" style={{ padding: '16px' }}>
      
      {/* Main layout container (styled like Atlantis panel card) */}
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6">
          
          <div 
            className="chat-main card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              height: 'calc(100vh - 120px)',
              minHeight: '520px',
              overflow: 'hidden',
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }}
          >
            
            {/* Chat Header */}
            <div 
              style={{
                background: '#fff',
                borderBottom: '1px solid #dee2e6',
                padding: '10px 14px',
                flexShrink: 0
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>
                <img 
                  src="/vendor/images/game-icon-png.png" 
                  alt="Game icon" 
                  width="32" 
                  height="32" 
                  onClick={() => handlePillClick('yantri')} 
                  style={{ cursor: 'pointer', flexShrink: 0 }}
                />

                <span 
                  style={{
                    color: '#000',
                    fontWeight: 'bold',
                    textTransform: 'capitalize',
                    fontSize: '0.98rem',
                    flexShrink: 0,
                    cursor: 'pointer'
                  }}
                  onClick={() => handlePillClick('yantri')}
                >
                  {gameName}
                </span>

                <input 
                  type="date"
                  style={{
                    width: '120px',
                    height: '28px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    padding: '0 4px',
                    fontSize: '0.8rem',
                    color: '#000',
                    textAlign: 'center',
                    background: '#fff',
                    cursor: 'pointer',
                    marginLeft: '8px'
                  }}
                  value={toInputDate(currentDate)}
                  onChange={(e) => handleDateChange(toApiDate(e.target.value))}
                />

                <button 
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#6861ce',
                    fontSize: '1.2rem',
                    padding: 0,
                    marginLeft: '4px'
                  }}
                  onClick={() => handlePillClick('yantri')}
                  title="Yantri grid input"
                >
                  📅
                </button>

                {selPage === '1' && (
                  <button 
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#6861ce',
                      fontWeight: 'bold',
                      fontSize: '0.84rem',
                      whiteSpace: 'nowrap',
                      marginLeft: '6px'
                    }}
                    onClick={handleOpenBulkModal}
                  >
                    💬 Bulk Share
                  </button>
                )}

                {userBalanceText && (
                  <span 
                    style={{
                      fontSize: '0.9rem',
                      fontWeight: 'bold',
                      color: 'green',
                      marginLeft: 'auto',
                      flexShrink: 0
                    }}
                  >
                    {userBalanceText}
                  </span>
                )}
              </div>

              <div style={{ fontSize: '0.8rem', color: '#000', textTransform: 'capitalize', padding: '4px 0', marginTop: '2px' }}>
                <span style={{ fontWeight: 'bold' }}>{customerNameText}</span>&nbsp;({rates})
              </div>
            </div>

            {/* Messages Thread Feed */}
            <div 
              style={{
                flex: '1 1 0',
                minHeight: '40px',
                overflowY: 'auto',
                overflowX: 'hidden',
                background: '#fff',
                padding: '8px 0'
              }}
            >
              {loadingMessages ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#888' }}>
                  <span className="spin"></span> Loading message logs...
                </div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#aaa', fontSize: '0.86rem' }}>
                  No messages for this date.
                </div>
              ) : (
                messages.map((m, idx) => {
                  const isSent = String(m.Sender) === '0'; // Sent by customer
                  const rowBg = isSent ? '#f9f4d9' : '#ffffff';
                  const isYantri = m.IsYantriStyle === true || m.IsYantriStyle === 'True' || m.IsYantriStyle === 'true';
                  const isByAdmin = m.IsSendByReceiver === true || m.IsSendByReceiver === 'True' || m.IsSendByReceiver === 'true';

                  return (
                    <div 
                      key={m.ChatID || idx}
                      style={{
                        width: '100%',
                        padding: '6px 12px',
                        borderBottom: '1px solid #eee',
                        overflow: 'hidden',
                        background: rowBg
                      }}
                    >
                      {/* Right Action stack */}
                      <div style={{ float: 'right', display: 'flex', flexDirection: 'column', gap: '4px', marginLeft: '8px' }}>
                        <button 
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6861ce', fontSize: '0.85rem' }}
                          onClick={handleOpenBulkModal}
                          title="Forward / Share"
                        >
                          ↪
                        </button>
                        <button 
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', fontSize: '0.85rem' }}
                          onClick={() => handleCopyChatText(m.Message)}
                          title="Copy text"
                        >
                          📋
                        </button>
                        {((m.IsAccepted === 'Pending' && String(m.X) === '1') || (isByAdmin && String(m.X) === '0' && m.IsAccepted !== 'Rejected')) && (
                          <button 
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
                            onClick={() => handleEditMessage(m)}
                            title="Edit message bet"
                          >
                            ✏️
                          </button>
                        )}
                        {m.IsAccepted === 'Pending' && isSent && (
                          <button 
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'red', fontSize: '0.85rem' }}
                            onClick={() => handleDeleteChatMsg(m.ChatID)}
                            title="Delete"
                          >
                            🗑
                          </button>
                        )}
                      </div>

                      {/* Content panel */}
                      <div style={{ textAlign: 'left', fontSize: '0.9rem' }}>
                        
                        <span style={{ wordBreak: 'break-word', display: 'block', fontSize: '0.92rem', color: '#000' }}>
                          {m.Message}
                        </span>

                        {isYantri && (m.TotalAmount || m.Rate || m.MessageDateTime) && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '0.78rem', color: '#555', marginTop: '4px' }}>
                            {m.TotalAmount && <span style={{ fontWeight: 'bold', color: '#000' }}>Total: {m.TotalAmount}</span>}
                            {m.Rate && <span>Rate: {m.Rate}</span>}
                            {m.MessageDateTime && <span style={{ fontStyle: 'italic' }}>{new Date(m.MessageDateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>}
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px', fontSize: '0.8rem' }}>
                          {m.IsAccepted === 'Accepted' && <span style={{ color: 'green', fontWeight: 'bold' }}>Ok</span>}
                          {m.IsAccepted === 'Rejected' && <span style={{ color: 'red', fontWeight: 'bold' }}>Cancelled</span>}
                          {m.IsAccepted === 'Pending' && <span style={{ color: '#888', fontWeight: 'bold' }}>Pending</span>}

                          {isByAdmin && <span style={{ color: '#1572e8', fontWeight: 'bold', fontSize: '0.74rem' }}>BY ADMIN</span>}
                          
                          {/* Subuser accept controls */}
                          {!isSent && m.IsAccepted === 'Pending' && isYantri && (
                            <button 
                              className="btn btn-xs btn-success font-weight-bold"
                              style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                              onClick={() => handleAcceptStatus(m.ChatID, 'Accepted')}
                            >
                              ✔ Accept
                            </button>
                          )}
                          {!isSent && m.IsAccepted !== 'Rejected' && isYantri && !(m.IsSettled === true || m.IsSettled === 'True') && (
                            <button 
                              className="btn btn-xs btn-danger font-weight-bold"
                              style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                              onClick={() => handleAcceptStatus(m.ChatID, 'Rejected')}
                            >
                              ✕ Reject
                            </button>
                          )}
                        </div>

                      </div>

                      {m.subuserID && (
                        <div style={{ textAlign: 'right', fontSize: '0.66rem', color: '#888', marginTop: '2px' }}>
                          {m.subuserID}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={messageEndRef} />
            </div>

            {/* Grand Total Footer */}
            {grandTotal > 0 && (
              <div 
                style={{
                  padding: '6px 12px',
                  fontWeight: 'bold',
                  fontSize: '0.9rem',
                  background: '#fff',
                  borderBottom: '1px solid #e0e0e0',
                  textAlign: 'center',
                  color: '#000',
                  flexShrink: 0
                }}
              >
                Grand Total: {grandTotal}
              </div>
            )}

            {/* Pending Typing Bet Grid table preview */}
            {typedRows.length > 0 && (
              <div 
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  flex: '0 0 auto',
                  maxHeight: '120px',
                  overflowY: 'auto',
                  borderTop: '1px solid #dee2e6',
                  background: '#f8f9fa',
                  padding: '4px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 6px', fontSize: '0.78rem', borderBottom: '1px solid #ddd' }}>
                  <span style={{ fontWeight: 'bold' }}>Total Amount: {typedTotal}</span>
                  <button 
                    className="btn btn-xs btn-danger" 
                    style={{ fontSize: '0.7rem', padding: '1px 6px' }}
                    onClick={handleClearTable}
                  >
                    Clear (F5)
                  </button>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '2px' }}>
                  <tbody>
                    {typedRows.map((tr, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ width: '60px', padding: '2px', textAlign: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>{tr.num}</td>
                        <td style={{ padding: '2px', textAlign: 'center', fontSize: '0.8rem' }}>{tr.amt}</td>
                        <td style={{ width: '40px', padding: '2px', textAlign: 'center' }}>
                          <button 
                            className="btn btn-xs btn-danger" 
                            style={{ padding: '1px 4px', fontSize: '0.7rem' }}
                            onClick={() => handleDeleteRow(idx)}
                          >
                            &times;
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Edit Mode Bar */}
            {editModeActive && (
              <div style={{ background: '#fff3cd', border: '1px solid #ffc107', padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <span style={{ fontWeight: 'bold', color: '#856404' }}>✍🏻 Edit Mode:</span>
                <button className="btn btn-xs btn-primary font-weight-bold" onClick={submitTypedAssignments}>
                  Update Entry
                </button>
                <button 
                  className="btn btn-xs btn-success font-weight-bold" 
                  onClick={() => {
                    setEditModeActive(false);
                    submitTypedAssignments();
                  }}
                >
                  Add as New
                </button>
                <button className="btn btn-xs btn-danger" onClick={handleClearTable}>
                  Cancel
                </button>
              </div>
            )}

            {/* Input fields stack */}
            <div 
              style={{
                background: '#fff',
                borderTop: '1px solid #dee2e6',
                padding: '8px',
                flexShrink: 0
              }}
            >
              
              {/* Active input row */}
              <div style={{ display: 'flex', gap: '2px', alignItems: 'stretch', marginBottom: '8px' }}>
                {pillMode === 'chat' ? (
                  <input 
                    type="text"
                    className="form-control"
                    placeholder="Enter text message here..."
                    style={{ height: '36px', fontSize: '0.9rem' }}
                    value={txtonlyTextMessage}
                    onChange={(e) => setTxtonlyTextMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        sendPlainMessage();
                      }
                    }}
                  />
                ) : (
                  <>
                    <input 
                      type="text"
                      ref={txtMessageRef}
                      className="form-control"
                      placeholder={pillMode === 'laddi' ? 'From No.' : 'Number'}
                      style={{ flex: 3, height: '36px', fontSize: '0.9rem' }}
                      value={txtMessage}
                      onChange={(e) => setTxtMessage(e.target.value.replace(/[^0-9a-ab-b]/gi, ''))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (pillMode === 'laddi') {
                            document.getElementById('txtSecondNumberInput')?.focus();
                          } else if (pillMode === 'palat') {
                            document.getElementById('txtMessageAmountPalatInput')?.focus();
                          } else {
                            document.getElementById('txtMessageAmountInput')?.focus();
                          }
                        }
                      }}
                    />
                    
                    {pillMode === 'laddi' && (
                      <input 
                        type="text"
                        id="txtSecondNumberInput"
                        className="form-control"
                        placeholder="To No."
                        style={{ width: '70px', height: '36px', fontSize: '0.9rem' }}
                        value={txtSecondNumber}
                        onChange={(e) => setTxtSecondNumber(e.target.value.replace(/[^0-9]/g, ''))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            document.getElementById('txtMessageAmountInput')?.focus();
                          }
                        }}
                      />
                    )}

                    {pillMode === 'palat' && (
                      <input 
                        type="text"
                        id="txtMessageAmountPalatInput"
                        className="form-control"
                        placeholder="Palat Amt"
                        style={{ width: '80px', height: '36px', fontSize: '0.9rem' }}
                        value={txtMessageAmountPalat}
                        onChange={(e) => setTxtMessageAmountPalat(e.target.value.replace(/[^0-9]/g, ''))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            document.getElementById('txtMessageAmountInput')?.focus();
                          }
                        }}
                      />
                    )}

                    <input 
                      type="text"
                      id="txtMessageAmountInput"
                      className="form-control"
                      placeholder="Amt"
                      style={{ flex: 1, height: '36px', fontSize: '0.9rem', minWidth: '60px' }}
                      value={txtMessageAmount}
                      onChange={(e) => setTxtMessageAmount(e.target.value.replace(/[^0-9-]/g, ''))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          processSaveBulkMessage(txtMessage, txtMessageAmount);
                        }
                      }}
                    />
                  </>
                )}

                <button 
                  className="btn btn-primary"
                  style={{ background: '#6861ce', borderColor: '#6861ce', height: '36px', whiteSpace: 'nowrap', fontWeight: 'bold' }}
                  onClick={btnSendClick}
                >
                  Save (F2)
                </button>
              </div>

              {/* Extra check options (Crossing/Pahada helpers) */}
              <div style={{ display: 'flex', gap: '14px', fontSize: '0.78rem', color: '#000', marginBottom: '6px' }}>
                {pillMode === 'crossing' && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', margin: 0 }}>
                    <input 
                      type="checkbox" 
                      checked={crossingWithoutJode}
                      onChange={(e) => setCrossingWithoutJode(e.target.checked)}
                    />
                    Without Jode
                  </label>
                )}
                {pillMode === 'pahada' && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', margin: 0 }}>
                    <input 
                      type="checkbox" 
                      checked={add3Pahada}
                      onChange={(e) => setAdd3Pahada(e.target.checked)}
                    />
                    ADD 3
                  </label>
                )}
              </div>

              {/* Navigation pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {[
                  { id: 'typing', label: 'Typing (Home)' },
                  { id: 'laddi', label: 'Laddi (F4)' },
                  { id: 'jode', label: 'Jode (F8)' },
                  { id: 'crossing', label: 'Cross (F9)' },
                  { id: 'pahada', label: 'Pahada (P)' },
                  { id: 'ander', label: 'Ander (A)' },
                  { id: 'bahar', label: 'Bahar (B)' },
                  { id: 'yantri', label: 'Yantri (End)' },
                  { id: '57', label: '57' },
                  { id: '43', label: '43' },
                  { id: 'palat', label: 'Palat' },
                  { id: 'chat', label: 'Chat' }
                ].map(p => (
                  <button 
                    key={p.id}
                    className={`btn btn-xs ${pillMode === p.id ? 'btn-success' : 'btn-light'}`}
                    style={{
                      borderRadius: '20px',
                      fontSize: '0.72rem',
                      fontWeight: 'bold',
                      border: '1px solid #dee2e6',
                      padding: '4px 10px',
                      color: pillMode === p.id ? '#fff' : '#6c757d',
                      backgroundColor: pillMode === p.id ? '#6861ce' : '#f8f9fa',
                      borderColor: pillMode === p.id ? '#6861ce' : '#dee2e6'
                    }}
                    onClick={() => handlePillClick(p.id)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

            </div>

          </div>

        </div>
      </div>

      {/* Yantri Modal Grid view */}
      {showYantriModal && (
        <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', overflowY: 'auto' }}>
          <div className="modal-dialog modal-lg" style={{ maxWidth: '1100px' }}>
            <div className="modal-content">
              <div className="modal-header" style={{ padding: '10px 14px' }}>
                <h5 className="modal-title" style={{ fontWeight: 'bold' }}>Yantri Matrix</h5>
                <button type="button" className="close" onClick={() => setShowYantriModal(false)}>
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body" style={{ padding: '8px' }}>
                
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '8px', padding: '0 8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.86rem', fontWeight: 'bold' }}>
                    <input 
                      type="checkbox" 
                      checked={yantriUpToDown} 
                      onChange={(e) => setYantriUpToDown(e.target.checked)} 
                    />
                    Up-To-Down
                  </label>
                  <button className="btn btn-sm btn-danger font-weight-bold" onClick={ymClear}>
                    Clear Grid
                  </button>
                </div>

                {/* 11-column matrix grid */}
                <div style={{ background: '#f0f4f8', padding: '4px', borderRadius: '4px' }}>
                  {/* Dara rows (10 rows) */}
                  {Array.from({ length: 10 }).map((_, rowIdx) => {
                    const start = rowIdx * 10 + 1;
                    return (
                      <div key={rowIdx} style={{ display: 'flex', gap: '2px', marginBottom: '2px' }}>
                        {Array.from({ length: 10 }).map((_, colIdx) => {
                          const num = start + colIdx;
                          return (
                            <div key={num} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#555' }}>
                                {String(num).padStart(2, '0')}
                              </span>
                              <input 
                                type="text"
                                className="form-control form-control-sm text-center"
                                style={{ height: '26px', padding: '2px', fontSize: '0.8rem', fontWeight: 'bold' }}
                                value={yantriValues[num]}
                                onChange={(e) => handleYantriCellChange(num, e.target.value)}
                              />
                            </div>
                          );
                        })}
                        {/* Totals spacer column */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#1572e8' }}>TOT</span>
                          <div style={{ fontSize: '0.82rem', fontWeight: 'bold', color: 'green', height: '26px', display: 'flex', alignItems: 'center' }}>
                            {Array.from({ length: 10 }).reduce((s, _, i) => s + (parseFloat(yantriValues[start + i]) || 0), 0)}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <hr style={{ margin: '8px 0', borderColor: '#ccc' }} />

                  {/* Aadar row */}
                  <div style={{ display: 'flex', gap: '2px', marginBottom: '2px' }}>
                    {AKHAR_AADAR.map(num => (
                      <div key={num} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#555' }}>{num}</span>
                        <input 
                          type="text"
                          className="form-control form-control-sm text-center"
                          style={{ height: '26px', padding: '2px', fontSize: '0.8rem', fontWeight: 'bold', background: '#f0f8ff' }}
                          value={yantriValues[num]}
                          onChange={(e) => handleYantriCellChange(num, e.target.value)}
                        />
                      </div>
                    ))}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#1572e8' }}>TOT</span>
                      <div style={{ fontSize: '0.82rem', fontWeight: 'bold', color: 'green', height: '26px', display: 'flex', alignItems: 'center' }}>
                        {AKHAR_AADAR.reduce((s, n) => s + (parseFloat(yantriValues[n]) || 0), 0)}
                      </div>
                    </div>
                  </div>

                  {/* Ander row */}
                  <div style={{ display: 'flex', gap: '2px', marginBottom: '2px' }}>
                    {AKHAR_ANDER.map(num => (
                      <div key={num} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#555' }}>{num}</span>
                        <input 
                          type="text"
                          className="form-control form-control-sm text-center"
                          style={{ height: '26px', padding: '2px', fontSize: '0.8rem', fontWeight: 'bold', background: '#f0f8ff' }}
                          value={yantriValues[num]}
                          onChange={(e) => handleYantriCellChange(num, e.target.value)}
                        />
                      </div>
                    ))}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#1572e8' }}>TOT</span>
                      <div style={{ fontSize: '0.82rem', fontWeight: 'bold', color: 'green', height: '26px', display: 'flex', alignItems: 'center' }}>
                        {AKHAR_ANDER.reduce((s, n) => s + (parseFloat(yantriValues[n]) || 0), 0)}
                      </div>
                    </div>
                  </div>

                </div>

              </div>
              <div className="modal-footer" style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '0.94rem', fontWeight: 'bold' }}>
                  Total Amount: <span style={{ color: 'green' }}>{yantriTotal}</span>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowYantriModal(false)}>Close</button>
                  <button type="button" className="btn btn-primary btn-sm" style={{ background: '#6861ce' }} onClick={ymSend}>Send (F2)</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Move/Copy Share Modal */}
      {showBulkModal && (
        <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', overflowY: 'auto' }}>
          <div className="modal-dialog" style={{ maxWidth: '520px' }}>
            <div className="modal-content">
              <div className="modal-header" style={{ background: '#6861ce', color: '#fff', padding: '10px 14px' }}>
                <h5 className="modal-title" style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>↪ Move / Copy Messages</h5>
                <button type="button" className="close" onClick={() => setShowBulkModal(false)} style={{ color: '#fff' }}>
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body" style={{ padding: '14px' }}>
                <div style={{ background: '#f8f9fa', padding: '6px 10px', borderRadius: '4px', fontSize: '0.78rem', color: '#555', marginBottom: '12px' }}>
                  <b>FROM:</b> {gameName} ({currentDate}) to Customer {mobile}
                </div>

                <div className="row" style={{ marginBottom: '10px' }}>
                  <div className="col-md-6" style={{ marginBottom: '8px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 'bold', display: 'block', marginBottom: '3px' }}>Target Date (TO)</label>
                    <input 
                      type="date"
                      className="form-control form-control-sm"
                      value={bulkDate}
                      onChange={(e) => setBulkDate(e.target.value)}
                    />
                  </div>
                  <div className="col-md-6" style={{ marginBottom: '8px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 'bold', display: 'block', marginBottom: '3px' }}>Target Game (TO)</label>
                    <select 
                      className="form-control form-control-sm"
                      value={selectedBulkGameId}
                      onChange={(e) => setSelectedBulkGameId(e.target.value)}
                    >
                      <option value="">-- Select Game --</option>
                      {bulkGameList.map(g => (
                        <option key={g.GID} value={g.GID}>{g.GameName}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6" style={{ marginBottom: '8px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 'bold', display: 'block', marginBottom: '3px' }}>Target Customer (TO)</label>
                    <input 
                      type="text" 
                      className="form-control form-control-sm"
                      placeholder="Search Customer name..."
                      value={bulkCustSearchText}
                      onChange={handleBulkCustSearch}
                      style={{ borderRadius: '4px 4px 0 0', borderBottom: 'none' }}
                    />
                    <select 
                      className="form-control form-control-sm"
                      style={{ borderRadius: '0 0 4px 4px', height: '100px' }}
                      multiple
                      value={[selectedBulkCustId]}
                      onChange={(e) => {
                        const matched = bulkCustomerList.find(c => String(c.UID) === String(e.target.value));
                        if (matched) {
                          handleSelectBulkCustomer(matched);
                        }
                      }}
                    >
                      {filteredBulkCustomers.map(c => (
                        <option key={c.UID} value={c.UID}>{c.Name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6" style={{ marginBottom: '8px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 'bold', display: 'block', marginBottom: '3px' }}>Target Rate (TO)</label>
                    <select 
                      className="form-control form-control-sm"
                      value={selectedBulkRateId}
                      onChange={(e) => setSelectedBulkRateId(e.target.value)}
                    >
                      <option value="">-- Select Rate --</option>
                      {bulkRatesList.map(r => (
                        <option key={r.RateID} value={r.RateID}>{r.Rate}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer" style={{ padding: '8px 12px', display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowBulkModal(false)}>Cancel</button>
                <button type="button" className="btn btn-success btn-sm" onClick={() => doBulkMoveCopy('copy')} disabled={bulkSubmitting}>
                  📋 Copy
                </button>
                <button type="button" className="btn btn-success btn-sm" onClick={() => doBulkMoveCopy('move')} disabled={bulkSubmitting}>
                  🔀 Move
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .spin { display: inline-block; width: 14px; height: 14px; border: 2px solid var(--border); border-top-color: var(--green); border-radius: 50%; animation: spin .6s linear infinite; vertical-align: middle; margin-right: 6px; }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)' }}>
        Loading Chat workspace...
      </div>
    }>
      <ChatWorkspace />
    </Suspense>
  );
}
