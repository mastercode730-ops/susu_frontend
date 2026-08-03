'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { API } from '../../../utils/api';
import { showToast } from '../../../utils/toast';

export default function ContactsPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.SuperAdmin === 'SuperAdmin';

  // Contact list states
  const [contacts, setContacts] = useState([]);
  const [activeStatusMap, setActiveStatusMap] = useState({}); // { mobile: { UID, IsActive } }
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // all, active, inactive

  // Form states
  const [cid, setCid] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [mobile, setMobile] = useState('');
  const [dPComm, setDPComm] = useState('0');
  const [dAmt, setDAmt] = useState('100');
  const [aPComm, setAPComm] = useState('0');
  const [aAmt, setAAmt] = useState('10');
  const [patti, setPatti] = useState('0');
  const [lc, setLc] = useState('0');
  const [selfComm, setSelfComm] = useState(false);
  const [yantriTo, setYantriTo] = useState(false);
  const [isLimit, setIsLimit] = useState(false);
  const [isUttar, setIsUttar] = useState(false);

  // 3rd party dropdowns selection state
  const [hissaPartyID, setHissaPartyID] = useState('0');
  const [hissaPer, setHissaPer] = useState('0');
  const [commPartyID, setCommPartyID] = useState('0');
  const [daraCommPer, setDaraCommPer] = useState('0');
  const [akharCommPer, setAkharCommPer] = useState('0');
  const [lcPartyID, setLcPartyID] = useState('0');
  const [lcCommPer, setLcCommPer] = useState('0');

  const [savingContact, setSavingContact] = useState(false);

  // Rates sub-form states
  const [selectedContactRates, setSelectedContactRates] = useState(null); // { cid, name }
  const [ratesList, setRatesList] = useState([]);
  const [loadingRates, setLoadingRates] = useState(false);
  const [editingRate, setEditingRate] = useState(false);
  const [rateID, setRateID] = useState('');
  const [rD_PComm, setRD_PComm] = useState('0');
  const [rD_Amt, setRD_Amt] = useState('100');
  const [rA_PComm, setRA_PComm] = useState('0');
  const [rA_Amt, setRA_Amt] = useState('10');
  const [rPatti, setRPatti] = useState('0');
  const [savingRate, setSavingRate] = useState(false);

  const [hideList, setHideList] = useState(false);

  // Input readonly states
  const [ratesReadonly, setRatesReadonly] = useState(false);

  // Refs for enter-key navigation
  const formRefs = {
    txtCustomerName: useRef(null),
    txtMobileNo: useRef(null),
    txtD_PComm: useRef(null),
    txtD_Amt: useRef(null),
    txtA_PComm: useRef(null),
    txtA_Amt: useRef(null),
    txtPatti: useRef(null),
    txtLC: useRef(null),
    ddlSrchCustomers: useRef(null),
    txt3rdPartyHissaPer: useRef(null),
    ddlCommParty: useRef(null),
    txtDaraCommPer: useRef(null),
    txtAkharCommPer: useRef(null),
    ddlLCParty: useRef(null),
    txtLCCommPer: useRef(null)
  };

  const loadActiveStatus = async () => {
    if (!isSuperAdmin) return;
    try {
      const r = await API.get('/api/customer/active-status');
      if (r && r.success) {
        const map = {};
        (r.data || []).forEach(row => {
          map[row.Mobile] = { UID: row.UID, IsActive: row.IsActive };
        });
        setActiveStatusMap(map);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadContactsList = async () => {
    setLoadingContacts(true);
    try {
      const r = await API.get('/api/customer/list');
      if (r && r.success) {
        setContacts(r.data || []);
      }
    } catch (e) {
      console.error(e);
      showToast('Error loading contacts', 'error');
    } finally {
      setLoadingContacts(false);
    }
  };

  // Check rate readonly
  const checkRatesReadonly = async (contactId) => {
    try {
      const r = await API.get(`/api/customer/${contactId}/rates`);
      if (r && r.success && r.data) {
        if (r.data.length > 1) {
          setRatesReadonly(true);
        } else if (r.data.length === 1) {
          setRatesReadonly(false);
          const rate = r.data[0];
          setDPComm(rate.D_PComm || '0');
          setDAmt(rate.D_Amt || '100');
          setAPComm(rate.A_PComm || '0');
          setAAmt(rate.A_Amt || '10');
          setPatti(rate.Patti || '0');
        } else {
          setRatesReadonly(false);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadContactsList();
  }, []);

  useEffect(() => {
    if (user) {
      loadActiveStatus();
    }
  }, [user]);

  // Handle enter key navigation inside forms
  const handleFormKeyDown = (e, nextFieldName) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (nextFieldName === 'SAVE') {
        handleSaveContact();
      } else {
        const ref = formRefs[nextFieldName];
        if (ref && ref.current && !ref.current.readOnly) {
          ref.current.focus();
          if (ref.current.select) ref.current.select();
        }
      }
    }
  };

  // Toggle user login active status (Super Admin only)
  const handleToggleActiveStatus = async (mobileNo, currentActiveState) => {
    const nextVal = !currentActiveState;
    try {
      const r = await API.post('/api/customer/toggle-active', { mobile: mobileNo, isActive: nextVal });
      if (r && r.success) {
        setActiveStatusMap(prev => ({
          ...prev,
          [mobileNo]: { ...prev[mobileNo], IsActive: nextVal }
        }));
        showToast('Status updated successfully!');
      } else {
        showToast(r?.message || 'Error updating status', 'error');
      }
    } catch (e) {
      showToast('Connection error updating status', 'error');
    }
  };

  // Toggle flags in customer list
  const handleToggleFlag = async (contactId, field, currentValue) => {
    const isYes = currentValue === 'True' || currentValue === 1 || currentValue === true;
    const newVal = isYes ? 'False' : 'True';
    try {
      const r = await API.post('/api/customer/toggle', { cid: contactId, field, value: newVal });
      if (r && r.success) {
        setContacts(prev => prev.map(c => {
          if (c.CID === contactId) {
            return { ...c, [field]: newVal };
          }
          return c;
        }));
        showToast('Contact updated!');
      } else {
        showToast('Toggle failed', 'error');
      }
    } catch (e) {
      showToast('Toggle error', 'error');
    }
  };

  // Select customer to edit
  const handleSelectCustomer = (c) => {
    const toBool = v => v === 'True' || v === true || v === 1 || v === '1';

    setCid(c.CID);
    setCustomerName(c.CustomerName || '');
    setMobile(c.Mobile || c.MobileNo || '');
    setDPComm(c.D_PComm || '0');
    setDAmt(c.D_Amt || '100');
    setAPComm(c.A_PComm || '0');
    setAAmt(c.A_Amt || '10');
    setPatti(c.Patti || '0');
    setLc(c.LC || '0');
    setSelfComm(toBool(c.IsSelfComm));
    setYantriTo(toBool(c.IsYantriTo));
    setIsLimit(toBool(c.IsLimit));
    setIsUttar(toBool(c.IsUttar));

    setHissaPartyID(c.ThirdPartyHissaID || '0');
    setHissaPer(c.ThirdPartyHissaPer || '0');
    setCommPartyID(c.ThirdPartyCommID || '0');
    setDaraCommPer(c.ThirdPartyDaraComm || '0');
    setAkharCommPer(c.ThirdPartyAkharComm || '0');
    setLcPartyID(c.ThirdPartyLCID || '0');
    setLcCommPer(c.ThirdPartyLCPer || '0');

    checkRatesReadonly(c.CID);

    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      if (formRefs.txtCustomerName.current) {
        formRefs.txtCustomerName.current.focus();
      }
    }, 300);
  };

  // Save/Update Contact
  const handleSaveContact = async () => {
    if (!customerName.trim() || !mobile.trim()) {
      showToast('Name and Mobile required', 'error');
      return;
    }

    setSavingContact(true);
    const body = {
      customerName: customerName.trim(),
      mobileNo: mobile.trim(),
      d_PComm: dPComm,
      d_Amt: dAmt,
      a_PComm: aPComm,
      a_Amt: aAmt,
      patti,
      lc,
      isSelfComm: selfComm,
      isYantriTo: yantriTo,
      isLimit,
      isUttar,
      thirdPartyHissaID: hissaPartyID !== '0' ? hissaPartyID : 0,
      thirdPartyHissaPer: hissaPartyID !== '0' ? hissaPer : 0,
      thirdPartyCommID: commPartyID !== '0' ? commPartyID : 0,
      thirdPartyDaraComm: commPartyID !== '0' ? daraCommPer : 0,
      thirdPartyAkharComm: commPartyID !== '0' ? akharCommPer : 0,
      thirdPartyLCID: lcPartyID !== '0' ? lcPartyID : 0,
      thirdPartyLCPer: lcPartyID !== '0' ? lcCommPer : 0,
      cid: cid || ''
    };

    try {
      const r = cid 
        ? await API.post('/api/customer/update', body) 
        : await API.post('/api/customer', body);

      if (r && r.success) {
        showToast(cid ? 'Contact updated!' : 'Contact saved!');
        handleResetForm();
        await loadContactsList();
      } else {
        showToast(r?.message || 'Error saving contact', 'error');
      }
    } catch (e) {
      showToast('Server error. Try again.', 'error');
    } finally {
      setSavingContact(false);
    }
  };

  // Delete Contact
  const handleDeleteCustomer = async () => {
    if (!cid) return;
    if (!window.confirm('Delete this contact? All pending chats will be rejected.')) return;
    
    try {
      const r = await API.post('/api/customer/delete', { cid });
      if (r && r.success) {
        showToast('Contact deleted');
        handleResetForm();
        await loadContactsList();
      } else {
        showToast(r?.message || 'Error deleting', 'error');
      }
    } catch (e) {
      showToast('Error deleting contact', 'error');
    }
  };

  // Load rates panel
  const handleShowRates = async (contactId, name) => {
    setSelectedContactRates({ cid: contactId, name });
    handleResetRateForm();
    await handleLoadRates(contactId);
    
    setTimeout(() => {
      const element = document.getElementById('ratesCardSection');
      if (element) element.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleLoadRates = async (contactId) => {
    setLoadingRates(true);
    try {
      const r = await API.get(`/api/customer/${contactId}/rates`);
      if (r && r.success) {
        setRatesList(r.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRates(false);
    }
  };

  // Save customer rates
  const handleSaveRate = async () => {
    if (!selectedContactRates) return;
    const type = editingRate ? 1 : 0;
    const dpc = parseFloat(rD_PComm);
    const da = parseFloat(rD_Amt);
    const apc = parseFloat(rA_PComm);
    const aa = parseFloat(rA_Amt);
    const rpatti = parseFloat(rPatti);

    if (dpc < 0 || dpc > 100 || apc < 0 || apc > 100 || rpatti < 0 || rpatti > 100 || da <= 0 || da > 100 || aa <= 0 || aa > 10) {
      showToast('Invalid values! D Amt: 1-100, A Amt: 1-10, % fields: 0-100', 'error');
      return;
    }

    setSavingRate(true);
    try {
      const r = await API.post('/api/customer/rates', {
        cid: selectedContactRates.cid,
        rateID: rateID || 0,
        d_PComm: dpc,
        d_Amt: da,
        a_PComm: apc,
        a_Amt: aa,
        patti: rpatti,
        type
      });

      if (r && r.success) {
        showToast(editingRate ? 'Rate updated!' : 'Rate added!');
        handleResetRateForm();
        await handleLoadRates(selectedContactRates.cid);
      } else {
        showToast(r?.message || 'Error saving rate', 'error');
      }
    } catch (e) {
      showToast('Connection error saving rate', 'error');
    } finally {
      setSavingRate(false);
    }
  };

  const handleDeleteRate = async () => {
    if (!rateID || !selectedContactRates) return;
    try {
      const r = await API.post('/api/customer/rates', {
        cid: selectedContactRates.cid,
        rateID,
        type: 2,
        d_PComm: rD_PComm,
        d_Amt: rD_Amt,
        a_PComm: rA_PComm,
        a_Amt: rA_Amt,
        patti: rPatti
      });

      if (r && r.success) {
        showToast('Rate deleted');
        handleResetRateForm();
        await handleLoadRates(selectedContactRates.cid);
      } else {
        showToast(r?.message || 'Error deleting rate', 'error');
      }
    } catch (e) {
      showToast('Error connection delete rate', 'error');
    }
  };

  const handleEditRate = (rate) => {
    setRateID(rate.RateID);
    setRD_PComm(rate.D_PComm);
    setRD_Amt(rate.D_Amt);
    setRA_PComm(rate.A_PComm);
    setRA_Amt(rate.A_Amt);
    setRPatti(rate.Patti);
    setEditingRate(true);
  };

  const handleResetRateForm = () => {
    setRateID('');
    setRD_PComm('0');
    setRD_Amt('100');
    setRA_PComm('0');
    setRA_Amt('10');
    setRPatti('0');
    setEditingRate(false);
  };

  const handleResetForm = () => {
    setCid('');
    setCustomerName('');
    setMobile('');
    setDPComm('0');
    setDAmt('100');
    setAPComm('0');
    setAAmt('10');
    setPatti('0');
    setLc('0');
    setSelfComm(false);
    setYantriTo(false);
    setIsLimit(false);
    setIsUttar(false);
    setHissaPartyID('0');
    setHissaPer('0');
    setCommPartyID('0');
    setDaraCommPer('0');
    setAkharCommPer('0');
    setLcPartyID('0');
    setLcCommPer('0');
    setRatesReadonly(false);
    
    if (formRefs.txtCustomerName.current) {
      formRefs.txtCustomerName.current.focus();
    }
  };

  // Filter lists
  const filteredContacts = contacts.filter(c => {
    const name = c.CustomerName || '';
    const mob = c.Mobile || c.MobileNo || '';
    const matchQuery = name.toLowerCase().includes(searchQuery.toLowerCase()) || mob.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchQuery) return false;
    if (!isSuperAdmin || activeFilter === 'all') return true;

    const status = activeStatusMap[mob];
    const isActive = status && (status.IsActive === 'True' || status.IsActive === true);
    
    return activeFilter === 'active' ? isActive : !isActive;
  });

  return (
    <div className="content">
      <div className="row">
        {/* Left Form creator panel */}
        <div className={hideList ? "col-md-12" : "col-md-5"}>
          <div className="card" id="formCard">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="card-title" style={{ fontWeight: 'bold' }}>{cid ? 'Edit Contact' : 'Create Contact'}</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-toggle-list btn-sm" onClick={() => setHideList(!hideList)}>
                  {hideList ? 'Show List' : 'Hide List'}
                </button>
                {cid && (
                  <button className="btn btn-success btn-sm" onClick={handleResetForm}>
                    + New
                  </button>
                )}
              </div>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label htmlFor="txtCustomerName">Contact Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      id="txtCustomerName" 
                      placeholder="Enter Customer Name" 
                      style={{ textTransform: 'capitalize' }}
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      onKeyDown={(e) => handleFormKeyDown(e, 'txtMobileNo')}
                      ref={formRefs.txtCustomerName}
                      autoFocus
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label htmlFor="txtMobileNo">Mobile</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      id="txtMobileNo" 
                      placeholder="Enter Mobile No" 
                      maxLength={10} 
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/[^0-9]/g, ''))}
                      onKeyDown={(e) => handleFormKeyDown(e, 'txtD_PComm')}
                      ref={formRefs.txtMobileNo}
                      readOnly={!!cid}
                    />
                  </div>
                </div>
              </div>
              
              <div className="row">
                <div className="col-md-3">
                  <div className="form-group">
                    <label htmlFor="txtD_PComm">D_PComm</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      id="txtD_PComm" 
                      value={dPComm}
                      onChange={(e) => setDPComm(e.target.value)}
                      onKeyDown={(e) => handleFormKeyDown(e, 'txtD_Amt')}
                      ref={formRefs.txtD_PComm}
                      readOnly={ratesReadonly}
                    />
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="form-group">
                    <label htmlFor="txtD_Amt">D_Amt</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      id="txtD_Amt" 
                      value={dAmt}
                      onChange={(e) => setDAmt(e.target.value)}
                      onKeyDown={(e) => handleFormKeyDown(e, 'txtA_PComm')}
                      ref={formRefs.txtD_Amt}
                      readOnly={ratesReadonly}
                    />
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="form-group">
                    <label htmlFor="txtA_PComm">A_PComm</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      id="txtA_PComm" 
                      value={aPComm}
                      onChange={(e) => setAPComm(e.target.value)}
                      onKeyDown={(e) => handleFormKeyDown(e, 'txtA_Amt')}
                      ref={formRefs.txtA_PComm}
                      readOnly={ratesReadonly}
                    />
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="form-group">
                    <label htmlFor="txtA_Amt">A_Amt</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      id="txtA_Amt" 
                      value={aAmt}
                      onChange={(e) => setAAmt(e.target.value)}
                      onKeyDown={(e) => handleFormKeyDown(e, 'txtPatti')}
                      ref={formRefs.txtA_Amt}
                      readOnly={ratesReadonly}
                    />
                  </div>
                </div>
              </div>
              
              <div className="row">
                <div className="col-md-3">
                  <div className="form-group">
                    <label htmlFor="txtPatti">Patti</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      id="txtPatti" 
                      value={patti}
                      onChange={(e) => setPatti(e.target.value)}
                      onKeyDown={(e) => handleFormKeyDown(e, 'txtLC')}
                      ref={formRefs.txtPatti}
                      readOnly={ratesReadonly}
                    />
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="form-group">
                    <label htmlFor="txtLC">LC</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      id="txtLC" 
                      value={lc}
                      onChange={(e) => setLc(e.target.value)}
                      onKeyDown={(e) => handleFormKeyDown(e, 'ddlSrchCustomers')}
                      ref={formRefs.txtLC}
                    />
                  </div>
                </div>
              </div>

              {/* 3rd Party Settings */}
              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label htmlFor="ddlSrchCustomers">3rd Hissa Party</label>
                    <select 
                      className="form-control" 
                      id="ddlSrchCustomers"
                      value={hissaPartyID}
                      onChange={(e) => setHissaPartyID(e.target.value)}
                      onKeyDown={(e) => handleFormKeyDown(e, 'txt3rdPartyHissaPer')}
                      ref={formRefs.ddlSrchCustomers}
                    >
                      <option value="0">Select Customer Name</option>
                      {contacts.map(c => <option value={c.CID} key={c.CID}>{c.CustomerName}</option>)}
                    </select>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label htmlFor="txt3rdPartyHissaPer">Hissa (%)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      id="txt3rdPartyHissaPer" 
                      value={hissaPer}
                      onChange={(e) => setHissaPer(e.target.value)}
                      onKeyDown={(e) => handleFormKeyDown(e, 'ddlCommParty')}
                      ref={formRefs.txt3rdPartyHissaPer}
                    />
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-md-4">
                  <div className="form-group">
                    <label htmlFor="ddlCommParty">3rd Comm Party</label>
                    <select 
                      className="form-control" 
                      id="ddlCommParty"
                      value={commPartyID}
                      onChange={(e) => setCommPartyID(e.target.value)}
                      onKeyDown={(e) => handleFormKeyDown(e, 'txtDaraCommPer')}
                      ref={formRefs.ddlCommParty}
                    >
                      <option value="0">Select Customer Name</option>
                      {contacts.map(c => <option value={c.CID} key={c.CID}>{c.CustomerName}</option>)}
                    </select>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="form-group">
                    <label htmlFor="txtDaraCommPer">Dara (%)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      id="txtDaraCommPer" 
                      value={daraCommPer}
                      onChange={(e) => setDaraCommPer(e.target.value)}
                      onKeyDown={(e) => handleFormKeyDown(e, 'txtAkharCommPer')}
                      ref={formRefs.txtDaraCommPer}
                    />
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="form-group">
                    <label htmlFor="txtAkharCommPer">Akhar (%)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      id="txtAkharCommPer" 
                      value={akharCommPer}
                      onChange={(e) => setAkharCommPer(e.target.value)}
                      onKeyDown={(e) => handleFormKeyDown(e, 'ddlLCParty')}
                      ref={formRefs.txtAkharCommPer}
                    />
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label htmlFor="ddlLCParty">3rd LC Party</label>
                    <select 
                      className="form-control" 
                      id="ddlLCParty"
                      value={lcPartyID}
                      onChange={(e) => setLcPartyID(e.target.value)}
                      onKeyDown={(e) => handleFormKeyDown(e, 'txtLCCommPer')}
                      ref={formRefs.ddlLCParty}
                    >
                      <option value="0">Select Customer Name</option>
                      {contacts.map(c => <option value={c.CID} key={c.CID}>{c.CustomerName}</option>)}
                    </select>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label htmlFor="txtLCCommPer">LC (%)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      id="txtLCCommPer" 
                      value={lcCommPer}
                      onChange={(e) => setLcCommPer(e.target.value)}
                      onKeyDown={(e) => handleFormKeyDown(e, 'SAVE')}
                      ref={formRefs.txtLCCommPer}
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <input 
                  type="checkbox" 
                  id="chkSelfComm"
                  checked={selfComm}
                  onChange={(e) => setSelfComm(e.target.checked)}
                />{' '}
                <label htmlFor="chkSelfComm">Self Commission</label>
                &nbsp;&nbsp;&nbsp;&nbsp;
                <input 
                  type="checkbox" 
                  id="chkYantriTo"
                  checked={yantriTo}
                  onChange={(e) => setYantriTo(e.target.checked)}
                />{' '}
                <label htmlFor="chkYantriTo">Yantri To</label>
                &nbsp;&nbsp;&nbsp;&nbsp;
                <input 
                  type="checkbox" 
                  id="chkIsLimit"
                  checked={isLimit}
                  onChange={(e) => setIsLimit(e.target.checked)}
                />{' '}
                <label htmlFor="chkIsLimit">Limit</label>
                &nbsp;&nbsp;&nbsp;&nbsp;
                <input 
                  type="checkbox" 
                  id="chkIsUttar"
                  checked={isUttar}
                  onChange={(e) => setIsUttar(e.target.checked)}
                />{' '}
                <label htmlFor="chkIsUttar">Uttar</label>
              </div>
            </div>
            
            <div className="card-action">
              <button className="btn btn-success" onClick={handleSaveContact} disabled={savingContact}>
                {savingContact ? 'Saving...' : cid ? 'Update' : 'Save'}
              </button>
              {cid && (
                <button className="btn btn-danger" onClick={handleDeleteCustomer} style={{ marginLeft: '10px' }}>
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>

        {!hideList && (
          /* Right Contacts List panel */
          <div className="col-md-7">
          <div className="card">
            <div className="card-header" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="card-title" style={{ fontWeight: 'bold' }}>All Contacts</div>
                <div style={{ fontSize: '0.86rem', color: 'var(--muted)', fontWeight: 600 }}>
                  {filteredContacts.length} contacts
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text" 
                  id="srchCustomer"
                  className="form-control"
                  placeholder="Filter by name or mobile..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ flex: 1 }}
                />
                
                {isSuperAdmin && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #ced4da', borderRadius: '4px', padding: '0 8px', background: '#fff' }}>
                    <input 
                      type="radio" 
                      id="fAll" 
                      name="activeFilter" 
                      checked={activeFilter === 'all'}
                      onChange={() => setActiveFilter('all')}
                    />{' '}
                    <label htmlFor="fAll" style={{ margin: 0, fontSize: '0.72rem', cursor: 'pointer' }}>All</label>
                    
                    <input 
                      type="radio" 
                      id="fActive" 
                      name="activeFilter" 
                      checked={activeFilter === 'active'}
                      onChange={() => setActiveFilter('active')}
                    />{' '}
                    <label htmlFor="fActive" style={{ margin: 0, fontSize: '0.72rem', cursor: 'pointer' }}>Active</label>

                    <input 
                      type="radio" 
                      id="fInactive" 
                      name="activeFilter" 
                      checked={activeFilter === 'inactive'}
                      onChange={() => setActiveFilter('inactive')}
                    />{' '}
                    <label htmlFor="fInactive" style={{ margin: 0, fontSize: '0.72rem', cursor: 'pointer' }}>Inactive</label>
                  </div>
                )}
              </div>
            </div>
            
            <div className="table-responsive">
              {loadingContacts ? (
                <div className="emsg">
                  <span className="spin"></span> Loading...
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="emsg">No contacts found</div>
              ) : (
                <table className="table-bordered-bd-primary table-hover" style={{ textAlign: 'center', width: '100%' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'LightGray' }}>
                      <th style={{ padding: '8px', width: '50px' }}>Edit</th>
                      <th style={{ textAlign: 'left', padding: '8px' }}>Customer</th>
                      <th style={{ width: '80px' }}>Self Comm</th>
                      <th style={{ width: '80px' }}>Yantri To</th>
                      {isSuperAdmin && <th style={{ width: '90px' }}>Status</th>}
                      <th style={{ width: '60px' }}>Rates</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContacts.map((c) => {
                      const cidAttr = c.CID;
                      const name = c.CustomerName || '';
                      const mob = c.Mobile || c.MobileNo || '';
                      
                      const isSelf = c.IsSelfComm === 'True' || c.IsSelfComm === 1 || c.IsSelfComm === true;
                      const isYantri = c.IsYantriTo === 'True' || c.IsYantriTo === 1 || c.IsYantriTo === true;

                      const status = activeStatusMap[mob];
                      const isActive = status && (status.IsActive === 'True' || status.IsActive === true);

                      return (
                        <tr 
                          key={cidAttr} 
                          id={`row_${cidAttr}`}
                          onClick={() => handleSelectCustomer(c)}
                          style={{ cursor: 'pointer' }}
                          className={cid === cidAttr ? 'table-active' : ''}
                        >
                          <td style={{ padding: '8px' }}>
                            <img 
                              src="/vendor/images/edit-icon-orange-pencil-0.png" 
                              width="26" 
                              height="26" 
                              style={{ cursor: 'pointer' }}
                              onClick={(e) => { e.stopPropagation(); handleSelectCustomer(c); }}
                              alt="Edit"
                            />
                          </td>
                          <td style={{ textAlign: 'left', padding: '8px' }}>
                            <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{name}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{mob}</div>
                          </td>
                          <td>
                            <button 
                              className={`btn-flag ${isSelf ? 'yes' : 'no'}`}
                              onClick={(e) => { e.stopPropagation(); handleToggleFlag(cidAttr, 'IsSelfComm', c.IsSelfComm); }}
                            >
                              {isSelf ? 'Yes' : 'No'}
                            </button>
                          </td>
                          <td>
                            <button 
                              className={`btn-flag ${isYantri ? 'yes' : 'no'}`}
                              onClick={(e) => { e.stopPropagation(); handleToggleFlag(cidAttr, 'IsYantriTo', c.IsYantriTo); }}
                            >
                              {isYantri ? 'Yes' : 'No'}
                            </button>
                          </td>
                          {isSuperAdmin && (
                            <td>
                              {status ? (
                                <button 
                                  className={`btn-status ${isActive ? 'yes' : 'no'}`}
                                  onClick={(e) => { e.stopPropagation(); handleToggleActiveStatus(mob, isActive); }}
                                >
                                  {isActive ? 'Active' : 'Deactivated'}
                                </button>
                              ) : (
                                <span style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>No login</span>
                              )}
                            </td>
                          )}
                          <td>
                            <button 
                              className="btn btn-success btn-sm"
                              onClick={(e) => { e.stopPropagation(); handleShowRates(cidAttr, name); }}
                            >
                              Rate
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
          </div>
        )}
      </div>

      {/* Sub Rates Management Card */}
      {selectedContactRates && (
        <div className="row" id="ratesCardSection">
          <div className="col-md-12">
            <div className="card" id="ratesCard">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="card-title" style={{ fontWeight: 'bold' }}>
                  Manage Rates for <span style={{ color: 'var(--green2)' }}>{selectedContactRates.name}</span>
                </div>
                <button className="btn btn-danger btn-sm" onClick={() => setSelectedContactRates(null)}>
                  Close
                </button>
              </div>
              
              <div className="card-body">
                {/* Rate Adding Form */}
                <div className="row" style={{ marginBottom: '20px', borderBottom: '1px solid #ced4da', paddingBottom: '20px' }}>
                  <div className="col-md-2">
                    <div className="form-group">
                      <label>D_PComm</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        value={rD_PComm}
                        onChange={(e) => setRD_PComm(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="form-group">
                      <label>D_Amt</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        value={rD_Amt}
                        onChange={(e) => setRD_Amt(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="form-group">
                      <label>A_PComm</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        value={rA_PComm}
                        onChange={(e) => setRA_PComm(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="form-group">
                      <label>A_Amt</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        value={rA_Amt}
                        onChange={(e) => setRA_Amt(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="form-group">
                      <label>Patti</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        value={rPatti}
                        onChange={(e) => setRPatti(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="col-md-2" style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                    <button 
                      className="btn btn-success btn-block" 
                      style={{ height: '40px' }}
                      onClick={handleSaveRate}
                      disabled={savingRate}
                    >
                      {savingRate ? '...' : editingRate ? 'Edit Rate' : 'ADD Rate'}
                    </button>
                    {editingRate && (
                      <button 
                        className="btn btn-danger" 
                        style={{ height: '40px' }}
                        onClick={handleDeleteRate}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                {/* Rates list table */}
                <div className="table-responsive">
                  {loadingRates ? (
                    <div className="emsg"><span className="spin"></span> Loading...</div>
                  ) : ratesList.length === 0 ? (
                    <div className="emsg">No rates added yet. Add first rate above.</div>
                  ) : (
                    <table className="table-bordered-bd-primary table-hover" style={{ textAlign: 'center', width: '100%' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'LightGray' }}>
                          <th style={{ padding: '6px' }}>#</th>
                          <th>D%</th>
                          <th>D Amt</th>
                          <th>A%</th>
                          <th>A Amt</th>
                          <th>Patti%</th>
                          <th>Rate</th>
                          <th>Edit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ratesList.map((d, i) => (
                          <tr key={d.RateID || i}>
                            <td style={{ padding: '6px' }}>{i + 1}</td>
                            <td>{d.D_PComm}</td>
                            <td>{d.D_Amt}</td>
                            <td>{d.A_PComm}</td>
                            <td>{d.A_Amt}</td>
                            <td>{d.Patti}</td>
                            <td style={{ color: 'var(--green2)', fontWeight: 600 }}>
                              {d.D_PComm}/{d.D_Amt}-{d.A_PComm}/{d.A_Amt}-{d.Patti}
                            </td>
                            <td>
                              <img 
                                src="/vendor/images/edit-icon-orange-pencil-0.png" 
                                width="26" 
                                height="26" 
                                style={{ cursor: 'pointer' }} 
                                onClick={() => handleEditRate(d)}
                                alt="Edit"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .btn-toggle-list { background-color: #6c757d !important; color: #fff !important; border: none !important; }
        .btn-toggle-list:hover,
        .btn-toggle-list:focus,
        .btn-toggle-list:active { background-color: #5a6268 !important; color: #fff !important; box-shadow: none !important; }

        .btn-flag { cursor: pointer; color: #fff; border: none; border-radius: 2px; font-size: small; height: 28px; width: 42px; font-weight: bold; }
        .btn-flag.yes { background-color: #31ce36; }
        .btn-flag.no { background-color: #f25961; }
        
        .btn-status { cursor: pointer; color: #fff; border: none; border-radius: 2px; font-size: small; height: 28px; width: 84px; font-weight: bold; }
        .btn-status.yes { background-color: #31ce36; }
        .btn-status.no { background-color: #f25961; }

        .emsg { color: var(--muted); text-align: center; padding: 20px; font-size: .84rem; }
        .spin { display: inline-block; width: 14px; height: 14px; border: 2px solid var(--border); border-top-color: var(--green); border-radius: 50%; animation: spin .6s linear infinite; vertical-align: middle; margin-right: 6px; }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  );
}
