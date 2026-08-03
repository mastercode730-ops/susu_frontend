'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { API } from '../../../utils/api';
import { showToast } from '../../../utils/toast';

// Constants for Yantri grid layout
const DARA_NUMS = Array.from({ length: 100 }, (_, i) => i + 1);
const AKHAR_AADAR = [111, 222, 333, 444, 555, 666, 777, 888, 999, 1000];
const AKHAR_ANDER = [1111, 2222, 3333, 4444, 5555, 6666, 7777, 8888, 9999, 10000];
const ALL_NUMS = [...DARA_NUMS, ...AKHAR_AADAR, ...AKHAR_ANDER];

const ANDER_MAP = {
  1111: ['11', '12', '13', '14', '15', '16', '17', '18', '19', '10'],
  2222: ['21', '22', '23', '24', '25', '26', '27', '28', '29', '20'],
  3333: ['31', '32', '33', '34', '35', '36', '37', '38', '39', '30'],
  4444: ['41', '42', '43', '44', '45', '46', '47', '48', '49', '40'],
  5555: ['51', '52', '53', '54', '55', '56', '57', '58', '59', '50'],
  6666: ['61', '62', '63', '64', '65', '66', '67', '68', '69', '60'],
  7777: ['71', '72', '73', '74', '75', '76', '77', '78', '79', '70'],
  8888: ['81', '82', '83', '84', '85', '86', '87', '88', '89', '80'],
  9999: ['91', '92', '93', '94', '95', '96', '97', '98', '99', '90'],
  10000: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '100']
};

const AADAR_MAP = {
  111: ['1', '11', '21', '31', '41', '51', '61', '71', '81', '91'],
  222: ['2', '12', '22', '32', '42', '52', '62', '72', '82', '92'],
  333: ['3', '13', '23', '33', '43', '53', '63', '73', '83', '93'],
  444: ['4', '14', '24', '34', '44', '54', '64', '74', '84', '94'],
  555: ['5', '15', '25', '35', '45', '55', '65', '75', '85', '95'],
  666: ['6', '16', '26', '36', '46', '56', '66', '76', '86', '96'],
  777: ['7', '17', '27', '37', '47', '57', '67', '77', '87', '97'],
  888: ['8', '18', '28', '38', '48', '58', '68', '78', '88', '98'],
  999: ['9', '19', '29', '39', '49', '59', '69', '79', '89', '99'],
  1000: ['10', '20', '30', '40', '50', '60', '70', '80', '90', '100']
};

// Banker's Rounding helper
function bankersRound(x) {
  const floor = Math.floor(x);
  const diff = x - floor;
  if (diff < 0.5) return floor;
  if (diff > 0.5) return floor + 1;
  return (Math.abs(floor % 2) === 0) ? floor : floor + 1;
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

function YantriWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Search parameters redirect context
  const GID_P = searchParams.get('GameID') || searchParams.get('GID') || '';
  const RATES_P = searchParams.get('Rates') || '';
  const SUID_P = searchParams.get('SelectedUID') || '';
  const DATE_P = searchParams.get('Date') || '';
  const MODE_P = searchParams.get('mode') || 'actual';

  // State Variables
  const [selectedDate, setSelectedDate] = useState('');
  const [games, setGames] = useState([]);
  const [selectedGameId, setSelectedGameId] = useState('');
  const [agents, setAgents] = useState([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [ratesText, setRatesText] = useState('');

  // Modes
  const [yantriMode, setYantriMode] = useState('actual'); // actual, daily, agent, special
  const [negativeSale, setNegativeSale] = useState(false);
  const [shiftAtoD, setShiftAtoD] = useState(true);

  // Core Data
  const [numValues, setNumValues] = useState(() => {
    const initial = {};
    ALL_NUMS.forEach(n => initial[n] = 0);
    return initial;
  });

  // Client lists for forwards
  const [forwardClients, setForwardClients] = useState([]);
  const [forwardRates, setForwardRates] = useState([]);
  const [forwardGames, setForwardGames] = useState([]);
  const [selectedFwdClient, setSelectedFwdClient] = useState('');
  const [selectedFwdRate, setSelectedFwdRate] = useState('');
  const [selectedFwdGame, setSelectedFwdGame] = useState('');

  // Client lists for negative sales
  const [negClients, setNegClients] = useState([]);
  const [negRates, setNegRates] = useState([]);
  const [selectedNegClient, setSelectedNegClient] = useState('');
  const [selectedNegRate, setSelectedNegRate] = useState('');

  // Manage Special Clients Modal
  const [showManageModal, setShowManageModal] = useState(false);
  const [manageClientsList, setManageClientsList] = useState([]);
  const [manageClientsFilter, setManageClientsFilter] = useState('');

  // Active Tab
  const [activeTab, setActiveTab] = useState('cutting'); // cutting, add, adjust, parts, forward, negsale

  // Cutting State
  const [cutMode, setCutMode] = useState('amount'); // amount, percent
  const [roundOff, setRoundOff] = useState('0');
  const [cuttingD, setCuttingD] = useState('');
  const [cuttingA, setCuttingA] = useState('');
  const [cuttingHistory, setCuttingHistory] = useState([]);
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState('');

  // Add State
  const [addNum, setAddNum] = useState('');
  const [addAmt, setAddAmt] = useState('');

  // Adjust State
  const [adjMode, setAdjMode] = useState('limit'); // limit, remaining, multiply, increase, decrease
  const [adjVal, setAdjVal] = useState('');

  // Parts State
  const [partsMax, setPartsMax] = useState('');
  const [partsGhar, setPartsGhar] = useState('');
  const [partsCount, setPartsCount] = useState('2');
  const [dataParts, setDataParts] = useState([]);
  const [selectedPartIndex, setSelectedPartIndex] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);

  // Initialize
  useEffect(() => {
    initWorkspace();
  }, []);

  const initWorkspace = async () => {
    setLoading(true);
    try {
      // Parallel fetches
      const [gamesRes, fwdClientsRes, negClientsRes] = await Promise.all([
        API.get('/api/yantri/games'),
        API.get('/api/yantri/uttar-clients'),
        API.get('/api/yantri/uttar-clients')
      ]);

      if (gamesRes && gamesRes.data) {
        setGames(gamesRes.data);
      }
      if (fwdClientsRes && fwdClientsRes.data) {
        setForwardClients(fwdClientsRes.data);
      }
      if (negClientsRes && negClientsRes.data) {
        setNegClients(negClientsRes.data);
      }

      // Check if redirect params exist
      if (GID_P && SUID_P && DATE_P && RATES_P) {
        setYantriMode('agent');
        setRatesText(RATES_P);
        setSelectedDate(toInputDate(DATE_P));
        setSelectedGameId(GID_P);

        // Fetch agents list
        const agentsRes = await API.get(`/api/yantri/agents?gid=${GID_P}&date=${encodeURIComponent(DATE_P)}`);
        if (agentsRes && agentsRes.data) {
          setAgents(agentsRes.data);
        }
        setSelectedAgentId(SUID_P);
        await loadYantriData(GID_P, DATE_P, 'agent', negativeSale, SUID_P, RATES_P);
      } else {
        // Load default latest date
        const defaultGameId = gamesRes?.data?.[0]?.GID || '';
        setSelectedGameId(defaultGameId);
        
        let dateVal = toApiDate(new Date());
        if (defaultGameId) {
          const lDateRes = await API.get(`/api/yantri/latest-date?gid=${defaultGameId}`);
          if (lDateRes && lDateRes.success && lDateRes.date) {
            dateVal = lDateRes.date;
          }
        }
        setSelectedDate(toInputDate(dateVal));
        await loadYantriData(defaultGameId, dateVal, yantriMode, negativeSale, '', '');
      }
    } catch (e) {
      console.error(e);
      showToast('Error initializing Yantri', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadYantriData = async (gid, dateStr, modeVal, negSaleVal, agentIdVal, ratesVal) => {
    if (!gid || !dateStr) return;
    setLoading(true);

    // Reset grid numbers
    const cleared = {};
    ALL_NUMS.forEach(n => cleared[n] = 0);
    setNumValues(cleared);

    try {
      const r = await API.get(
        `/api/yantri/data?gid=${gid}&date=${encodeURIComponent(dateStr)}&mode=${modeVal}` +
        `&negSale=${negSaleVal}&agentUID=${agentIdVal}&rates=${encodeURIComponent(ratesVal)}`
      );

      if (r && r.success && r.data?.length > 0) {
        const temp = { ...cleared };

        r.data.forEach(row => {
          const entries = (row.Message || '').split(',');
          entries.forEach(entry => {
            const parts = entry.split('=');
            if (parts.length < 2) return;
            let numStr = parts[0].trim();
            let val = parseFloat(parts[1]) || 0;

            if (numStr === '000') numStr = '1000';
            if (numStr === '0000') numStr = '10000';
            const num = parseInt(numStr);
            if (!num || isNaN(num)) return;

            if (modeVal === 'actual') {
              const dAmt = parseFloat(row.D_Amt) || 100;
              const aAmt = parseFloat(row.A_Amt) || 10;
              const dComm = 100 - dAmt;
              const aComm = 100 - (aAmt * 10);
              const pati = parseFloat(row.Pati_PComm) || 0;
              const hissa = parseFloat(row.HissaPerc) || 0;

              if (numStr.length <= 2 || num === 100) {
                val = val * ((100 - dComm) / 100);
              } else {
                val = val * ((100 - aComm) / 100);
              }
              val = val * ((100 - pati) / 100);
              val = val * ((100 - hissa) / 100);
            }

            temp[num] = (temp[num] || 0) + val;
          });
        });

        // Apply Shift A to D if checked
        if (shiftAtoD) {
          AKHAR_ANDER.forEach(n => {
            if (!temp[n]) return;
            const adj = bankersRound(Math.trunc(temp[n]) / 10);
            (ANDER_MAP[n] || []).forEach(dn => {
              const d = parseInt(dn);
              temp[d] = (temp[d] || 0) + adj;
            });
            temp[n] = 0;
          });

          AKHAR_AADAR.forEach(n => {
            if (!temp[n]) return;
            const adj = bankersRound(Math.trunc(temp[n]) / 10);
            (AADAR_MAP[n] || []).forEach(dn => {
              const d = parseInt(dn);
              temp[d] = (temp[d] || 0) + adj;
            });
            temp[n] = 0;
          });
        }

        // Apply integer truncation to save
        ALL_NUMS.forEach(n => {
          temp[n] = temp[n] ? Math.trunc(temp[n]) : 0;
        });

        setNumValues(temp);
      }
    } catch (e) {
      console.error(e);
      showToast('Error loading grid data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGameChange = async (gid) => {
    setSelectedGameId(gid);
    let dateVal = toApiDate(selectedDate);
    
    // Auto load latest date
    try {
      const r = await API.get(`/api/yantri/latest-date?gid=${gid}`);
      if (r && r.success && r.date) {
        dateVal = r.date;
        setSelectedDate(toInputDate(r.date));
      }
    } catch (e) {
      console.error(e);
    }

    if (yantriMode === 'agent') {
      fetchAgents(gid, dateVal);
    }
    await loadYantriData(gid, dateVal, yantriMode, negativeSale, selectedAgentId, ratesText);
  };

  const handleDateChange = async (dateStr) => {
    setSelectedDate(dateStr);
    const apiD = toApiDate(dateStr);
    if (yantriMode === 'agent') {
      fetchAgents(selectedGameId, apiD);
    }
    await loadYantriData(selectedGameId, apiD, yantriMode, negativeSale, selectedAgentId, ratesText);
  };

  const fetchAgents = async (gid, dateVal) => {
    try {
      const r = await API.get(`/api/yantri/agents?gid=${gid}&date=${encodeURIComponent(dateVal)}`);
      if (r && r.data) {
        setAgents(r.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAgentChange = async (agentId) => {
    setSelectedAgentId(agentId);
    const apiD = toApiDate(selectedDate);
    await loadYantriData(selectedGameId, apiD, yantriMode, negativeSale, agentId, ratesText);
  };

  const handleModeChange = async (modeVal) => {
    setYantriMode(modeVal);
    const apiD = toApiDate(selectedDate);
    if (modeVal === 'agent') {
      await fetchAgents(selectedGameId, apiD);
    }
    await loadYantriData(selectedGameId, apiD, modeVal, negativeSale, selectedAgentId, ratesText);
  };

  // Subtotals & Sum calculations
  const calculateTotals = () => {
    let dSale = 0;
    let aSale = 0;

    // 10 Rows of Dara totals
    const rowTotals = Array.from({ length: 10 }, (_, row) => {
      let rTot = 0;
      for (let i = row * 10 + 1; i <= row * 10 + 10; i++) {
        rTot += Math.trunc(numValues[i] || 0);
      }
      dSale += rTot;
      return rTot;
    });

    let aadarTot = 0;
    AKHAR_AADAR.forEach(n => {
      aadarTot += Math.trunc(numValues[n] || 0);
    });

    let anderTot = 0;
    AKHAR_ANDER.forEach(n => {
      anderTot += Math.trunc(numValues[n] || 0);
    });

    aSale = aadarTot + anderTot;
    const grand = dSale + aSale;

    return {
      rowTotals,
      aadarTot,
      anderTot,
      dSale,
      aSale,
      grand
    };
  };

  const totals = calculateTotals();

  // Cutting calculations
  const applyCutting = () => {
    const dCut = parseFloat(cuttingD) || 0;
    const aCut = parseFloat(cuttingA) || 0;
    const roundVal = parseFloat(roundOff) || 0;
    const isPct = cutMode === 'percent';

    if (!dCut && !aCut) return;

    // Save history logs
    const historyParts = [];
    if (aCut) {
      [...AKHAR_AADAR, ...AKHAR_ANDER].forEach(n => {
        if (!numValues[n]) return;
        let diff = isPct ? numValues[n] * aCut / 100 : Math.min(aCut, numValues[n]);
        diff = Math.max(0, Math.trunc(diff));
        if (diff) historyParts.push(`${n}=${diff}`);
      });
    }
    if (dCut) {
      DARA_NUMS.forEach(n => {
        if (!numValues[n]) return;
        let diff = isPct ? numValues[n] * dCut / 100 : Math.min(dCut, numValues[n]);
        diff = Math.max(0, Math.trunc(diff));
        if (diff) historyParts.push(`${n}=${diff}`);
      });
    }

    if (historyParts.length > 0) {
      const idx = cuttingHistory.length + 1;
      setCuttingHistory(prev => [...prev, { label: `Cut ${idx}`, values: historyParts.join(',') }]);
    }

    // Apply adjustments
    const nextValues = { ...numValues };
    const doRound = (v) => {
      if (!roundVal) return Math.trunc(v);
      return Math.round(Math.trunc(v) / roundVal) * roundVal;
    };

    if (dCut) {
      DARA_NUMS.forEach(n => {
        if (!nextValues[n]) return;
        let v = isPct ? nextValues[n] * (100 - dCut) / 100 : nextValues[n] - dCut;
        nextValues[n] = Math.max(0, doRound(v));
      });
    }

    if (aCut) {
      [...AKHAR_AADAR, ...AKHAR_ANDER].forEach(n => {
        if (!nextValues[n]) return;
        let v = isPct ? nextValues[n] * (100 - aCut) / 100 : nextValues[n] - aCut;
        nextValues[n] = Math.max(0, doRound(v));
      });
    }

    setNumValues(nextValues);
    setCuttingD('');
    setCuttingA('');
    showToast('Cutting applied!');
  };

  const handleShowHistory = (histIdx) => {
    setSelectedHistoryIndex(histIdx);
    if (histIdx === '') {
      // Reload actual values
      loadYantriData(selectedGameId, toApiDate(selectedDate), yantriMode, negativeSale, selectedAgentId, ratesText);
      return;
    }
    const selectedHistory = cuttingHistory[parseInt(histIdx)];
    if (!selectedHistory) return;

    const cleared = {};
    ALL_NUMS.forEach(n => cleared[n] = 0);
    selectedHistory.values.split(',').forEach(e => {
      const [ns, vs] = e.split('=');
      if (ns && vs) {
        cleared[parseInt(ns)] = Math.trunc(parseFloat(vs) || 0);
      }
    });
    setNumValues(cleared);
  };

  // Add Tab
  const addNumber = () => {
    let numInput = addNum.trim();
    const amt = parseFloat(addAmt) || 0;
    if (!numInput) return;

    if (numInput.length === 1 && parseInt(numInput) < 10) numInput = '0' + numInput;
    if (numInput === '00') numInput = '100';
    if (numInput === '000') numInput = '1000';
    if (numInput === '0000') numInput = '10000';

    const n = parseInt(numInput);
    if (isNaN(n) || !ALL_NUMS.includes(n)) {
      showToast('Invalid number', 'error');
      return;
    }

    const nextValues = { ...numValues };
    nextValues[n] = Math.max(0, Math.trunc((nextValues[n] || 0) + amt));
    setNumValues(nextValues);
    
    setAddNum('');
    setAddAmt('');
    showToast(`${n} &rarr; ${nextValues[n]}`);
  };

  // Adjust Tab
  const applyAdjust = () => {
    const adj = parseFloat(adjVal) || 0;
    const nextValues = { ...numValues };

    const compute = (oldVal) => {
      if (adjMode === 'limit') return Math.min(oldVal, adj);
      if (adjMode === 'multiply') return oldVal * adj;
      if (adjMode === 'remaining') return Math.max(0, adj - oldVal);
      if (adjMode === 'increase') return oldVal + (oldVal * adj / 100);
      if (adjMode === 'decrease') return (oldVal * (100 - adj)) / 100;
      return oldVal;
    };

    ALL_NUMS.forEach(n => {
      if (!nextValues[n]) return;
      nextValues[n] = Math.trunc(Math.max(0, compute(nextValues[n])));
    });
    setNumValues(nextValues);
    setAdjVal('');
    showToast('Adjustments applied!');
  };

  // Parts Tab
  const startParts = () => {
    const totalParts = parseInt(partsCount) || 2;
    const maxAmt = parseInt(partsMax) || 0;

    const snap = { ...numValues };
    const generatedParts = [];

    for (let j = 0; j < totalParts; j++) {
      const part = {};
      ALL_NUMS.forEach(n => {
        if (!snap[n]) {
          part[n] = 0;
          return;
        }
        let r1;
        if (j === totalParts - 1) {
          r1 = snap[n];
        } else {
          let max = Math.floor(snap[n] * 1.2 / totalParts);
          let min = Math.floor(snap[n] * 0.8 / (totalParts - j));
          if (maxAmt && max > maxAmt) max = maxAmt;
          if (min > max) [min, max] = [max, min];
          if (min < 0) min = 0;
          r1 = Math.floor(Math.random() * (max - min + 1)) + min;
          r1 = Math.min(r1, snap[n]);
          snap[n] -= r1;
        }
        part[n] = r1;
      });
      generatedParts.push(part);
    }

    setDataParts(generatedParts);
    setSelectedPartIndex((totalParts - 1).toString());
    
    // Set active values to last part
    const lastPart = generatedParts[totalParts - 1];
    setNumValues({ ...lastPart });
  };

  const handlePartIndexChange = (idxStr) => {
    setSelectedPartIndex(idxStr);
    if (idxStr === '') return;
    const idx = parseInt(idxStr);
    if (dataParts[idx]) {
      setNumValues({ ...dataParts[idx] });
    }
  };

  const resetParts = () => {
    setDataParts([]);
    setSelectedPartIndex('');
    loadYantriData(selectedGameId, toApiDate(selectedDate), yantriMode, negativeSale, selectedAgentId, ratesText);
  };

  // Copy helpers
  const buildMsgEquals = () => {
    let parts = [];
    DARA_NUMS.forEach(n => {
      const v = Math.trunc(numValues[n] || 0);
      if (v) parts.push(`${String(n).padStart(2, '0')}=${v}`);
    });
    [...AKHAR_AADAR, ...AKHAR_ANDER].forEach(n => {
      const v = Math.trunc(numValues[n] || 0);
      if (v) parts.push(`${n}=${v}`);
    });
    return parts.join(',');
  };

  const buildMsgBrackets = () => {
    let parts = [];
    DARA_NUMS.forEach(n => {
      const v = Math.trunc(numValues[n] || 0);
      if (v) parts.push(`${String(n).padStart(2, '0')}(${v})`);
    });
    [...AKHAR_AADAR, ...AKHAR_ANDER].forEach(n => {
      const v = Math.trunc(numValues[n] || 0);
      if (v) parts.push(`${n}(${v})`);
    });
    return parts.join(' ');
  };

  const buildMsgNumbers = () => {
    let parts = [];
    DARA_NUMS.forEach(n => {
      const v = Math.trunc(numValues[n] || 0);
      if (v) parts.push(n === 100 ? '00' : String(n).padStart(2, '0'));
    });
    AKHAR_AADAR.forEach(n => {
      const v = Math.trunc(numValues[n] || 0);
      if (v) parts.push(n === 1000 ? '000' : String(n));
    });
    AKHAR_ANDER.forEach(n => {
      const v = Math.trunc(numValues[n] || 0);
      if (v) parts.push(n === 10000 ? '0000' : String(n));
    });
    return parts.join(',');
  };

  const copyMsg = async (type) => {
    let text = '';
    if (type === 'equals') text = buildMsgEquals() + ' Grand Total: ' + totals.grand;
    if (type === 'brackets') text = buildMsgBrackets() + '\n\nGrand Total: ' + totals.grand;
    if (type === 'numbers') text = buildMsgNumbers();

    try {
      await navigator.clipboard.writeText(text);
      showToast('Copied!');
    } catch (e) {
      console.error(e);
      showToast('Failed to copy', 'error');
    }
  };

  const shareMsg = async () => {
    const text = buildMsgBrackets() + '\n\nGrand Total: ' + totals.grand;
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch (e) {
        console.error(e);
      }
    } else {
      copyMsg('brackets');
    }
  };

  // Forward Tab
  const handleFwdClientChange = async (cid) => {
    setSelectedFwdClient(cid);
    setSelectedFwdRate('');
    setForwardRates([]);
    setForwardGames([]);
    if (!cid) return;

    try {
      const r = await API.get(`/api/yantri/uttar-rates?cid=${cid}`);
      if (r) {
        if (r.data) setForwardRates(r.data);
        if (r.games) {
          setForwardGames(r.games);
          const matchedGame = r.games.find(g => String(g.GID) === String(selectedGameId));
          if (matchedGame) {
            setSelectedFwdGame(matchedGame.GID);
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const doForward = async () => {
    if (!selectedFwdClient || !selectedFwdRate || !selectedFwdGame) {
      showToast('Select client, rate & game', 'error');
      return;
    }

    const matchedRate = forwardRates.find(r => String(r.RateID) === String(selectedFwdRate));
    if (!matchedRate) return;

    const parts = [];
    let sumVal = 0;
    DARA_NUMS.forEach(n => {
      const v = Math.trunc(numValues[n] || 0);
      if (v) {
        parts.push(`${String(n).padStart(2, '0')}=${v}`);
        sumVal += v;
      }
    });
    [...AKHAR_AADAR, ...AKHAR_ANDER].forEach(n => {
      const v = Math.trunc(numValues[n] || 0);
      if (v) {
        parts.push(`${n}=${v}`);
        sumVal += v;
      }
    });

    if (parts.length === 0 || sumVal <= 0) {
      showToast('No data to forward', 'error');
      return;
    }

    setLoading(true);
    try {
      const r = await API.post('/api/yantri/forward', {
        message: parts.join(','),
        totalAmount: sumVal,
        gameID: selectedFwdGame,
        rateID: selectedFwdRate,
        fReceiverUID: matchedRate.fUID,
        D_PComm: matchedRate.D_PComm,
        D_Amt: matchedRate.D_Amt,
        A_PComm: matchedRate.A_PComm,
        A_Amt: matchedRate.A_Amt,
        Patti: matchedRate.Patti,
        ThirdPartyHissaID: matchedRate.ThirdPartyHissaID || 0,
        ThirdPartyHissaPer: matchedRate.ThirdPartyHissaPer || 0,
        ThirdPartyCommID: matchedRate.ThirdPartyCommID || 0,
        ThirdPartyDaraComm: matchedRate.ThirdPartyDaraComm || 0,
        ThirdPartyAkharComm: matchedRate.ThirdPartyAkharComm || 0
      });

      if (r && r.success) {
        showToast('Forwarded successfully!');
        setSelectedFwdGame('');
        setSelectedFwdRate('');
        setSelectedFwdClient('');
      } else {
        showToast(r?.message || 'Error forwarding', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Error forwarding transaction', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Neg Sale Tab
  const handleNegClientChange = async (cid) => {
    setSelectedNegClient(cid);
    setSelectedNegRate('');
    setNegRates([]);
    if (!cid) return;

    try {
      const r = await API.get(`/api/yantri/uttar-rates?cid=${cid}`);
      if (r && r.data) {
        setNegRates(r.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const doNegSale = async () => {
    if (!selectedNegClient || !selectedNegRate) {
      showToast('Select client & rate', 'error');
      return;
    }

    const matchedRate = negRates.find(r => String(r.RateID) === String(selectedNegRate));
    const matchedClient = negClients.find(c => String(c.CID) === String(selectedNegClient));
    if (!matchedRate || !matchedClient) return;

    const parts = [];
    let sumVal = 0;
    DARA_NUMS.forEach(n => {
      const v = Math.trunc(numValues[n] || 0);
      if (v) {
        const neg = -v;
        parts.push(`${String(n).padStart(2, '0')}=${neg}`);
        sumVal += neg;
      }
    });
    [...AKHAR_AADAR, ...AKHAR_ANDER].forEach(n => {
      const v = Math.trunc(numValues[n] || 0);
      if (v) {
        const neg = -v;
        parts.push(`${n}=${neg}`);
        sumVal += neg;
      }
    });

    if (parts.length === 0) {
      showToast('No data to save negative sale', 'error');
      return;
    }

    setLoading(true);
    try {
      const r = await API.post('/api/yantri/negative-sale', {
        message: parts.join(','),
        totalAmount: sumVal,
        gameID: selectedGameId,
        date: toApiDate(selectedDate),
        senderUID: matchedClient.UID || matchedRate.fUID || '',
        D_PComm: matchedRate.D_PComm,
        D_Amt: matchedRate.D_Amt,
        A_PComm: matchedRate.A_PComm,
        A_Amt: matchedRate.A_Amt,
        Patti: matchedRate.Patti,
        ThirdPartyHissaID: matchedRate.ThirdPartyHissaID || 0,
        ThirdPartyHissaPer: matchedRate.ThirdPartyHissaPer || 0,
        ThirdPartyCommID: matchedRate.ThirdPartyCommID || 0,
        ThirdPartyDaraComm: matchedRate.ThirdPartyDaraComm || 0,
        ThirdPartyAkharComm: matchedRate.ThirdPartyAkharComm || 0
      });

      if (r && r.success) {
        showToast('Negative Sale Saved successfully!');
        setSelectedNegRate('');
        setSelectedNegClient('');
      } else {
        showToast(r?.message || 'Error saving negative sale', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Error saving negative sale', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Manage Special Clients Modal
  const openManageModal = async () => {
    setShowManageModal(true);
    try {
      const r = await API.get('/api/yantri/all-clients');
      if (r && r.data) {
        setManageClientsList(r.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleSpecialClient = (cid, val) => {
    setManageClientsList(prev => prev.map(c => 
      String(c.CID) === String(cid) ? { ...c, IsYantriTo: val } : c
    ));
  };

  const handleSaveSpecialClients = async () => {
    const checked = manageClientsList
      .filter(c => c.IsYantriTo === true || c.IsYantriTo === 'True' || c.IsYantriTo === 1)
      .map(c => c.CID)
      .join(',');

    try {
      const r = await API.post('/api/yantri/save-clients', { customerIDs: checked });
      if (r && r.success) {
        showToast('Special Clients Saved!');
        setShowManageModal(false);
        // Refresh client lists
        const [c1, c2] = await Promise.all([
          API.get('/api/yantri/uttar-clients'),
          API.get('/api/yantri/uttar-clients')
        ]);
        if (c1 && c1.data) setForwardClients(c1.data);
        if (c2 && c2.data) setNegClients(c2.data);
      } else {
        showToast('Error saving special clients', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Error saving special clients', 'error');
    }
  };

  const getFilteredClients = () => {
    return manageClientsFilter
      ? manageClientsList.filter(c => (c.CustomerName || '').toLowerCase().includes(manageClientsFilter.toLowerCase()))
      : manageClientsList;
  };

  return (
    <div className="content">
      {/* Loading Overlay */}
      {loading && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            flexDirection: 'column',
            gap: '10px'
          }}
        >
          <div className="spin"></div>
          <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Loading workspace...</span>
        </div>
      )}

      <div 
        className="card" 
        style={{ 
          height: 'calc(100vh - 100px)', 
          minHeight: '600px', 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
        }}
      >
        
        {/* Top Header Bar */}
        <div 
          style={{ 
            background: '#075e54', 
            padding: '8px 14px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            flexWrap: 'wrap', 
            flexShrink: 0 
          }}
        >
          <button 
            style={{ 
              background: 'rgba(255, 255, 255, .2)', 
              border: 'none', 
              color: '#fff', 
              padding: '4px 12px', 
              borderRadius: '4px', 
              cursor: 'pointer', 
              fontSize: '0.82rem',
              fontWeight: 'bold'
            }}
            onClick={() => router.back()}
          >
            &larr; Back
          </button>
          
          <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '1rem', letterSpacing: '2px', marginRight: '8px' }}>
            YANTRI
          </span>

          <input 
            type="date" 
            style={{ 
              height: '28px', 
              border: '1px solid rgba(255,255,255,0.4)', 
              borderRadius: '4px', 
              background: 'rgba(255,255,255,0.15)', 
              color: '#fff', 
              padding: '0 8px', 
              fontSize: '0.8rem',
              outline: 'none'
            }}
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
          />

          <select 
            style={{ 
              height: '28px', 
              border: '1px solid rgba(255,255,255,0.4)', 
              borderRadius: '4px', 
              background: 'rgba(255,255,255,0.15)', 
              color: '#fff', 
              padding: '0 8px', 
              fontSize: '0.8rem',
              outline: 'none'
            }}
            value={selectedGameId}
            onChange={(e) => handleGameChange(e.target.value)}
          >
            {games.map(g => (
              <option key={g.GID} value={g.GID} style={{ background: '#075e54', color: '#fff' }}>
                {g.GameName}
              </option>
            ))}
          </select>

          {yantriMode === 'agent' && (
            <select 
              style={{ 
                height: '28px', 
                border: '1px solid rgba(255,255,255,0.4)', 
                borderRadius: '4px', 
                background: 'rgba(255,255,255,0.15)', 
                color: '#fff', 
                padding: '0 8px', 
                fontSize: '0.8rem',
                outline: 'none'
              }}
              value={selectedAgentId}
              onChange={(e) => handleAgentChange(e.target.value)}
            >
              <option value="" style={{ background: '#075e54', color: '#fff' }}>-- Choose Agent --</option>
              {agents.map(a => (
                <option key={a.fSenderID} value={a.fSenderID} style={{ background: '#075e54', color: '#fff' }}>
                  {a.CustomerName}
                </option>
              ))}
            </select>
          )}

          {ratesText && (
            <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '0.82rem', marginLeft: '8px' }}>
              Rates: {ratesText}
            </span>
          )}
        </div>

        {/* Mode Bar */}
        <div 
          style={{ 
            background: '#fff', 
            padding: '6px 12px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            flexWrap: 'wrap', 
            borderBottom: '2px solid #dee2e6', 
            flexShrink: 0 
          }}
        >
          <div className="btn-group btn-group-sm">
            {['actual', 'daily', 'agent', 'special'].map(m => (
              <button 
                key={m}
                className={`btn ${yantriMode === m ? 'btn-success' : 'btn-outline-secondary'}`}
                style={{ textTransform: 'capitalize', fontWeight: 'bold' }}
                onClick={() => handleModeChange(m)}
              >
                {m}
              </button>
            ))}
          </div>

          {yantriMode === 'special' && (
            <button className="btn btn-sm btn-info font-weight-bold" onClick={openManageModal}>
              Manage
            </button>
          )}

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.86rem', fontWeight: 'bold', cursor: 'pointer', margin: 0 }}>
              <input 
                type="checkbox" 
                checked={negativeSale} 
                onChange={(e) => {
                  setNegativeSale(e.target.checked);
                  const apiD = toApiDate(selectedDate);
                  loadYantriData(selectedGameId, apiD, yantriMode, e.target.checked, selectedAgentId, ratesText);
                }} 
              />
              Negative Sale
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.86rem', fontWeight: 'bold', cursor: 'pointer', margin: 0 }}>
              <input 
                type="checkbox" 
                checked={shiftAtoD} 
                onChange={(e) => {
                  setShiftAtoD(e.target.checked);
                  const apiD = toApiDate(selectedDate);
                  loadYantriData(selectedGameId, apiD, yantriMode, negativeSale, selectedAgentId, ratesText);
                }} 
              />
              A &rarr; D
            </label>
          </div>
        </div>

        {/* Workspace Body */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          
          {/* Left Grid Panel */}
          <div style={{ width: '75%', display: 'flex', flexDirection: 'column', minHeight: 0, borderRight: '2px solid #dee2e6' }}>
            <div 
              style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(11, 1fr)', 
                gridAutoRows: '1fr', 
                background: '#f0f4f8', 
                gap: '1px', 
                padding: '6px', 
                flex: 1, 
                minHeight: 0, 
                overflowY: 'auto' 
              }}
            >
              {/* Render 10 Rows of Dara */}
              {Array.from({ length: 10 }).map((_, rowIdx) => {
                const start = rowIdx * 10 + 1;
                const end = rowIdx * 10 + 10;
                
                return (
                  <React.Fragment key={rowIdx}>
                    {Array.from({ length: 10 }).map((_, colIdx) => {
                      const num = start + colIdx;
                      return (
                        <div 
                          key={num} 
                          style={{
                            background: '#fff',
                            border: '1px solid #dee2e6',
                            padding: '2px 4px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            overflow: 'hidden'
                          }}
                        >
                          <div style={{ fontSize: '0.78rem', color: '#075e54', fontWeight: '800' }}>
                            {String(num).padStart(2, '0')}
                          </div>
                          <div style={{ fontSize: '0.92rem', fontWeight: 'bold', color: '#222' }}>
                            {numValues[num] || ''}
                          </div>
                        </div>
                      );
                    })}
                    {/* Row Total cell */}
                    <div 
                      style={{
                        background: '#f0fdf4',
                        border: '1px solid #c3e6cb',
                        padding: '2px 4px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        overflow: 'hidden'
                      }}
                    >
                      <div style={{ fontSize: '0.78rem', color: '#075e54', fontWeight: '800' }}>TOT</div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 'bold', color: '#25d366' }}>
                        {totals.rowTotals[rowIdx] || ''}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}

              {/* Render Akhar Aadar */}
              {AKHAR_AADAR.map(num => (
                <div 
                  key={num} 
                  style={{
                    background: '#eff6ff',
                    border: '1px solid #dee2e6',
                    padding: '2px 4px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{ fontSize: '0.72rem', color: '#075e54', fontWeight: '900' }}>{num}</div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 'bold', color: '#222' }}>{numValues[num] || ''}</div>
                </div>
              ))}
              <div 
                style={{
                  background: '#dbeafe',
                  border: '1px solid #dee2e6',
                  padding: '2px 4px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  overflow: 'hidden'
                }}
              >
                <div style={{ fontSize: '0.72rem', color: '#075e54', fontWeight: '900' }}>TOT</div>
                <div style={{ fontSize: '0.92rem', fontWeight: 'bold', color: '#222' }}>{totals.aadarTot || ''}</div>
              </div>

              {/* Render Akhar Ander */}
              {AKHAR_ANDER.map(num => (
                <div 
                  key={num} 
                  style={{
                    background: '#eff6ff',
                    border: '1px solid #dee2e6',
                    padding: '2px 4px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{ fontSize: '0.72rem', color: '#075e54', fontWeight: '900' }}>{num}</div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 'bold', color: '#222' }}>{numValues[num] || ''}</div>
                </div>
              ))}
              <div 
                style={{
                  background: '#dbeafe',
                  border: '1px solid #dee2e6',
                  padding: '2px 4px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  overflow: 'hidden'
                }}
              >
                <div style={{ fontSize: '0.72rem', color: '#075e54', fontWeight: '900' }}>TOT</div>
                <div style={{ fontSize: '0.92rem', fontWeight: 'bold', color: '#222' }}>{totals.anderTot || ''}</div>
              </div>

            </div>
          </div>

          {/* Right Controls Panel */}
          <div style={{ width: '25%', display: 'flex', flexDirection: 'column', minHeight: 0, overflowY: 'auto' }}>
            
            {/* Totals Summary */}
            <div 
              style={{ 
                background: '#fff', 
                padding: '10px 14px', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '6px', 
                borderBottom: '2px solid #dee2e6', 
                fontSize: '0.92rem', 
                flexShrink: 0 
              }}
            >
              <div style={{ color: '#555' }}>
                Dara Sale: <span style={{ fontWeight: 'bold', color: '#25d366', fontSize: '1.1rem' }}>{totals.dSale}</span>
              </div>
              <div style={{ color: '#555' }}>
                Akhar Sale: <span style={{ fontWeight: 'bold', color: '#25d366', fontSize: '1.1rem' }}>{totals.aSale}</span>
              </div>
              <div style={{ color: '#555' }}>
                Grand Total: <span style={{ fontWeight: 'bold', color: '#25d366', fontSize: '1.1rem' }}>{totals.grand}</span>
              </div>
            </div>

            {/* Controls Tabs Form */}
            <div style={{ background: '#fff', padding: '8px 10px', flex: 1, minHeight: 0, overflowY: 'auto' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', marginBottom: '10px', borderBottom: '1px solid #dee2e6', paddingBottom: '6px' }}>
                {['cutting', 'add', 'adjust', 'parts', 'forward', 'negsale'].map(t => (
                  <button 
                    key={t}
                    className={`btn btn-xs ${activeTab === t ? 'btn-success' : 'btn-outline-secondary'}`}
                    style={{ textTransform: 'capitalize', fontSize: '0.74rem', fontWeight: 'bold', padding: '6px 2px' }}
                    onClick={() => setActiveTab(t)}
                  >
                    {t === 'negsale' ? 'Neg Sale' : t}
                  </button>
                ))}
              </div>

              {/* CUTTING TAB */}
              {activeTab === 'cutting' && (
                <div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.8rem', cursor: 'pointer', margin: 0 }}>
                      <input 
                        type="radio" 
                        name="cutMode" 
                        checked={cutMode === 'amount'} 
                        onChange={() => setCutMode('amount')} 
                      />
                      Amount
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.8rem', cursor: 'pointer', margin: 0 }}>
                      <input 
                        type="radio" 
                        name="cutMode" 
                        checked={cutMode === 'percent'} 
                        onChange={() => setCutMode('percent')} 
                      />
                      %Age
                    </label>
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '0.72rem', color: '#888' }}>Round Off</span>
                      <select 
                        className="form-control form-control-sm"
                        style={{ width: '60px', height: '26px', padding: '2px' }}
                        value={roundOff}
                        onChange={(e) => setRoundOff(e.target.value)}
                      >
                        <option value="0">0</option>
                        <option value="5">5</option>
                        <option value="10">10</option>
                        <option value="50">50</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', marginBottom: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.72rem', color: '#888', fontWeight: 'bold' }}>D Cutting</label>
                      <input 
                        type="number" 
                        className="form-control form-control-sm" 
                        placeholder="0"
                        value={cuttingD}
                        onChange={(e) => setCuttingD(e.target.value)}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.72rem', color: '#888', fontWeight: 'bold' }}>A Cutting</label>
                      <input 
                        type="number" 
                        className="form-control form-control-sm" 
                        placeholder="0"
                        value={cuttingA}
                        onChange={(e) => setCuttingA(e.target.value)}
                      />
                    </div>
                    <button className="btn btn-sm btn-success" style={{ height: '31px' }} onClick={applyCutting}>
                      Cut
                    </button>
                  </div>

                  {cuttingHistory.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '10px', marginBottom: '10px' }}>
                      <span style={{ fontSize: '0.78rem', color: '#888' }}>History:</span>
                      <select 
                        className="form-control form-control-sm" 
                        style={{ flex: 1 }}
                        value={selectedHistoryIndex}
                        onChange={(e) => handleShowHistory(e.target.value)}
                      >
                        <option value="">-- Select History --</option>
                        {cuttingHistory.map((h, i) => (
                          <option key={i} value={i}>{h.label}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '12px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                    <button className="btn btn-xs btn-success font-weight-bold" onClick={() => copyMsg('equals')}>= Copy</button>
                    <button className="btn btn-xs btn-success font-weight-bold" onClick={() => copyMsg('brackets')}>) Copy</button>
                    <button className="btn btn-xs btn-info font-weight-bold" onClick={() => copyMsg('numbers')}>Nums Only</button>
                    <button className="btn btn-xs btn-warning font-weight-bold text-white" onClick={shareMsg}>Share</button>
                  </div>
                </div>
              )}

              {/* ADD TAB */}
              {activeTab === 'add' && (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.72rem', color: '#888', fontWeight: 'bold' }}>Number</label>
                    <input 
                      type="text" 
                      className="form-control form-control-sm" 
                      placeholder="No."
                      value={addNum}
                      onChange={(e) => setAddNum(e.target.value.replace(/[^0-9]/g, ''))}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.72rem', color: '#888', fontWeight: 'bold' }}>Amount</label>
                    <input 
                      type="text" 
                      className="form-control form-control-sm" 
                      placeholder="Amt"
                      value={addAmt}
                      onChange={(e) => setAddAmt(e.target.value.replace(/[^0-9-]/g, ''))}
                    />
                  </div>
                  <button className="btn btn-sm btn-success" style={{ height: '31px' }} onClick={addNumber}>
                    Add
                  </button>
                </div>
              )}

              {/* ADJUST TAB */}
              {activeTab === 'adjust' && (
                <div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    {['limit', 'remaining', 'multiply', 'increase', 'decrease'].map(m => (
                      <label key={m} style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.76rem', cursor: 'pointer', margin: 0 }}>
                        <input 
                          type="radio" 
                          name="adjMode" 
                          checked={adjMode === m} 
                          onChange={() => setAdjMode(m)} 
                        />
                        <span style={{ textTransform: 'capitalize' }}>
                          {m === 'increase' ? 'Incr%' : m === 'decrease' ? 'Decr%' : m}
                        </span>
                      </label>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.72rem', color: '#888', fontWeight: 'bold' }}>Value</label>
                      <input 
                        type="number" 
                        className="form-control form-control-sm" 
                        placeholder="Val"
                        value={adjVal}
                        onChange={(e) => setAdjVal(e.target.value)}
                      />
                    </div>
                    <button className="btn btn-sm btn-success" style={{ height: '31px' }} onClick={applyAdjust}>
                      Apply
                    </button>
                  </div>
                </div>
              )}

              {/* PARTS TAB */}
              {activeTab === 'parts' && (
                <div>
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.72rem', color: '#888', fontWeight: 'bold' }}>Max Amount</label>
                      <input 
                        type="number" 
                        className="form-control form-control-sm" 
                        placeholder="Max"
                        value={partsMax}
                        onChange={(e) => setPartsMax(e.target.value)}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.72rem', color: '#888', fontWeight: 'bold' }}>Max Ghar</label>
                      <input 
                        type="number" 
                        className="form-control form-control-sm" 
                        placeholder="Ghar"
                        value={partsGhar}
                        onChange={(e) => setPartsGhar(e.target.value)}
                      />
                    </div>
                    <div style={{ width: '60px' }}>
                      <label style={{ fontSize: '0.72rem', color: '#888', fontWeight: 'bold' }}>Parts</label>
                      <select 
                        className="form-control form-control-sm animate-none" 
                        value={partsCount}
                        onChange={(e) => setPartsCount(e.target.value)}
                      >
                        {Array.from({ length: 9 }, (_, i) => i + 2).map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '10px' }}>
                    {dataParts.length === 0 ? (
                      <button className="btn btn-sm btn-success btn-block" onClick={startParts}>
                        Start
                      </button>
                    ) : (
                      <>
                        <select 
                          className="form-control form-control-sm" 
                          style={{ flex: 1 }}
                          value={selectedPartIndex}
                          onChange={(e) => handlePartIndexChange(e.target.value)}
                        >
                          {dataParts.map((_, i) => (
                            <option key={i} value={i}>Part {i + 1}</option>
                          ))}
                        </select>
                        <button className="btn btn-sm btn-danger" onClick={resetParts}>
                          Reset
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* FORWARD TAB */}
              {activeTab === 'forward' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '6px' }}>
                    <button className="btn btn-xs btn-outline-info font-weight-bold" onClick={openManageModal}>
                      ⚙ Manage Clients
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.72rem', color: '#888', fontWeight: 'bold' }}>Client</label>
                      <select 
                        className="form-control form-control-sm"
                        value={selectedFwdClient}
                        onChange={(e) => handleFwdClientChange(e.target.value)}
                      >
                        <option value="">Select Client</option>
                        {forwardClients.map(c => (
                          <option key={c.CID} value={c.CID}>{c.CustomerName || c.Mobile}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.72rem', color: '#888', fontWeight: 'bold' }}>Rate</label>
                      <select 
                        className="form-control form-control-sm"
                        value={selectedFwdRate}
                        onChange={(e) => setSelectedFwdRate(e.target.value)}
                      >
                        <option value="">Select Rate</option>
                        {forwardRates.map(r => (
                          <option key={r.RateID} value={r.RateID}>{r.Rate}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.72rem', color: '#888', fontWeight: 'bold' }}>Game</label>
                      <select 
                        className="form-control form-control-sm"
                        value={selectedFwdGame}
                        onChange={(e) => setSelectedFwdGame(e.target.value)}
                      >
                        <option value="">Select Game</option>
                        {forwardGames.map(g => (
                          <option key={g.GID} value={g.GID}>{g.GameName}</option>
                        ))}
                      </select>
                    </div>

                    <button className="btn btn-sm btn-success btn-block" style={{ marginTop: '8px' }} onClick={doForward}>
                      Forward &rarr;
                    </button>
                  </div>
                </div>
              )}

              {/* NEG SALE TAB */}
              {activeTab === 'negsale' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '6px' }}>
                    <button className="btn btn-xs btn-outline-info font-weight-bold" onClick={openManageModal}>
                      ⚙ Manage Clients
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.72rem', color: '#888', fontWeight: 'bold' }}>Client</label>
                      <select 
                        className="form-control form-control-sm"
                        value={selectedNegClient}
                        onChange={(e) => handleNegClientChange(e.target.value)}
                      >
                        <option value="">Select Client</option>
                        {negClients.map(c => (
                          <option key={c.CID} value={c.CID}>{c.CustomerName || c.Mobile}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.72rem', color: '#888', fontWeight: 'bold' }}>Rate</label>
                      <select 
                        className="form-control form-control-sm"
                        value={selectedNegRate}
                        onChange={(e) => setSelectedNegRate(e.target.value)}
                      >
                        <option value="">Select Rate</option>
                        {negRates.map(r => (
                          <option key={r.RateID} value={r.RateID}>{r.Rate}</option>
                        ))}
                      </select>
                    </div>

                    <button className="btn btn-sm btn-danger btn-block" style={{ marginTop: '8px' }} onClick={doNegSale}>
                      Save Negative Sale
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>

      </div>

      {/* Manage Special Clients Modal */}
      {showManageModal && (
        <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', overflowY: 'auto' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" style={{ fontWeight: 'bold' }}>Manage Special Clients</h5>
                <button type="button" className="close" onClick={() => setShowManageModal(false)}>
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body" style={{ padding: '14px' }}>
                <input 
                  type="text" 
                  className="form-control form-control-sm" 
                  placeholder="Filter by name..." 
                  style={{ marginBottom: '10px' }}
                  value={manageClientsFilter}
                  onChange={(e) => setManageClientsFilter(e.target.value)}
                />
                <div style={{ border: '1px solid #dee2e6', borderRadius: '4px', maxHeight: '300px', overflowY: 'auto' }}>
                  {getFilteredClients().map(c => {
                    const isChecked = c.IsYantriTo === true || c.IsYantriTo === 'True' || c.IsYantriTo === 1;
                    return (
                      <div 
                        key={c.CID} 
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderBottom: '1px solid #eee' }}
                      >
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={(e) => handleToggleSpecialClient(c.CID, e.target.checked)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        <div>
                          <div style={{ fontSize: '0.84rem', fontWeight: 'bold', textTransform: 'capitalize' }}>
                            {c.CustomerName}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#888' }}>
                            {c.Mobile}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowManageModal(false)}>Close</button>
                <button type="button" className="btn btn-success" onClick={handleSaveSpecialClients}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .spin { display: inline-block; width: 35px; height: 35px; border: 4px solid rgba(255,255,255,0.3); border-top-color: #25d366; border-radius: 50%; animation: spin .7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  );
}

export default function YantriPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)' }}>
        Loading Yantri Workspace...
      </div>
    }>
      <YantriWorkspace />
    </Suspense>
  );
}
