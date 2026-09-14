'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, Settings, Percent, Check, X, Shield, Search } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { API } from '../../../utils/api';
import { showToast } from '../../../utils/toast';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { Checkbox } from '../../../components/ui/checkbox';
import { Button } from '../../../components/ui/button';
import { StatusBadge, Badge } from '../../../components/ui/badge';
import { DataTable } from '../../../components/tables/DataTable';
import { Dialog } from '../../../components/ui/dialog';
import { LoadingSpinner } from '../../../components/ui/spinner';

// Dense "label beside field" row — matches the compact, professional data-entry
// form layout requested for this page (label bold + dark, field to the right).
function FormRow({ label, children, className }) {
  return (
    <div className={`grid grid-cols-[112px_1fr] items-center gap-x-3 ${className || ''}`}>
      <label className="text-sm font-bold text-slate-800">{label}</label>
      {children}
    </div>
  );
}

export default function ContactsPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.SuperAdmin === 'SuperAdmin';

  // Contact list states
  const [contacts, setContacts] = useState([]);
  const [activeStatusMap, setActiveStatusMap] = useState({});
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

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

  // 3rd party dropdowns
  const [hissaPartyID, setHissaPartyID] = useState('0');
  const [hissaPer, setHissaPer] = useState('0');
  const [commPartyID, setCommPartyID] = useState('0');
  const [daraCommPer, setDaraCommPer] = useState('0');
  const [akharCommPer, setAkharCommPer] = useState('0');
  const [lcPartyID, setLcPartyID] = useState('0');
  const [lcCommPer, setLcCommPer] = useState('0');

  const [savingContact, setSavingContact] = useState(false);

  // Rates sub-form states
  const [selectedContactRates, setSelectedContactRates] = useState(null);
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
  const [ratesReadonly, setRatesReadonly] = useState(false);

  const loadActiveStatus = async () => {
    if (!isSuperAdmin) return;
    try {
      const r = await API.get('/sapi/customer/active-status');
      if (r && r.success) {
        const map = {};
        (r.data || []).forEach((row) => {
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
      const r = await API.get('/sapi/customer/list');
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

  const checkRatesReadonly = async (contactId) => {
    try {
      const r = await API.get(`/sapi/customer/${contactId}/rates`);
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

  const handleToggleActiveStatus = async (mobileNo, currentActiveState) => {
    const nextVal = !currentActiveState;
    try {
      const r = await API.post('/sapi/customer/toggle-active', { mobile: mobileNo, isActive: nextVal });
      if (r && r.success) {
        setActiveStatusMap((prev) => ({
          ...prev,
          [mobileNo]: { ...prev[mobileNo], IsActive: nextVal },
        }));
        showToast(nextVal ? 'Customer login activated!' : 'Customer login deactivated!');
      } else {
        showToast(r?.message || 'Error updating status', 'error');
      }
    } catch (e) {
      showToast('Connection error updating status', 'error');
    }
  };

  const TOGGLE_FLAG_LABELS = {
    IsSelfComm: 'Self Commission',
    IsYantriTo: 'Yantri To',
    IsLimit: 'Limit',
    IsUttar: 'Uttar',
  };

  const handleToggleFlag = async (contactId, field, currentValue) => {
    const isYes = currentValue === 'True' || currentValue === 1 || currentValue === true;
    const newVal = isYes ? 'False' : 'True';
    const label = TOGGLE_FLAG_LABELS[field] || 'Setting';
    try {
      const r = await API.post('/sapi/customer/toggle', { cid: contactId, field, value: newVal });
      if (r && r.success) {
        setContacts((prev) =>
          prev.map((c) => {
            if (c.CID === contactId) {
              return { ...c, [field]: newVal };
            }
            return c;
          })
        );
        showToast(`${label} ${newVal === 'True' ? 'enabled' : 'disabled'}!`);
      } else {
        showToast('Toggle failed', 'error');
      }
    } catch (e) {
      showToast('Toggle error', 'error');
    }
  };

  const handleSelectCustomer = (c) => {
    const toBool = (v) => v === 'True' || v === true || v === 1 || v === '1';

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
  };

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
      cid: cid || '',
    };

    try {
      const r = cid
        ? await API.post('/sapi/customer/update', body)
        : await API.post('/sapi/customer', body);

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

  const handleDeleteCustomer = async () => {
    if (!cid) return;
    if (!window.confirm('Deactivate this contact? All pending chats will be rejected.')) return;

    try {
      const r = await API.post('/sapi/customer/delete', { cid });
      if (r && r.success) {
        showToast('Contact deactivated!');
        handleResetForm();
        await loadContactsList();
      } else {
        showToast(r?.message || 'Error deactivating contact', 'error');
      }
    } catch (e) {
      showToast('Error deactivating contact', 'error');
    }
  };

  const handleShowRates = async (contactId, name) => {
    setSelectedContactRates({ cid: contactId, name });
    handleResetRateForm();
    await handleLoadRates(contactId);
  };

  const handleLoadRates = async (contactId) => {
    setLoadingRates(true);
    try {
      const r = await API.get(`/sapi/customer/${contactId}/rates`);
      if (r && r.success) {
        setRatesList(r.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRates(false);
    }
  };

  const handleSaveRate = async () => {
    if (!selectedContactRates) return;
    const type = editingRate ? 1 : 0;
    const dpc = parseFloat(rD_PComm);
    const da = parseFloat(rD_Amt);
    const apc = parseFloat(rA_PComm);
    const aa = parseFloat(rA_Amt);
    const rpatti = parseFloat(rPatti);

    setSavingRate(true);
    try {
      const r = await API.post('/sapi/customer/rates', {
        cid: selectedContactRates.cid,
        rateID: rateID || 0,
        d_PComm: dpc,
        d_Amt: da,
        a_PComm: apc,
        a_Amt: aa,
        patti: rpatti,
        type,
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
      const r = await API.post('/sapi/customer/rates', {
        cid: selectedContactRates.cid,
        rateID,
        type: 2,
        d_PComm: rD_PComm,
        d_Amt: rD_Amt,
        a_PComm: rA_PComm,
        a_Amt: rA_Amt,
        patti: rPatti,
      });

      if (r && r.success) {
        showToast('Rate deactivated!');
        handleResetRateForm();
        await handleLoadRates(selectedContactRates.cid);
      } else {
        showToast(r?.message || 'Error deleting rate', 'error');
      }
    } catch (e) {
      showToast('Error deleting rate', 'error');
    }
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
  };

  const filteredContacts = contacts.filter((c) => {
    const name = c.CustomerName || '';
    const mob = c.Mobile || c.MobileNo || '';
    const matchQuery =
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mob.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchQuery) return false;
    if (!isSuperAdmin || activeFilter === 'all') return true;

    const status = activeStatusMap[mob];
    const isActive = status && (status.IsActive === 'True' || status.IsActive === true);

    return activeFilter === 'active' ? isActive : !isActive;
  });

  const columns = [
    {
      header: 'Customer',
      accessorKey: 'CustomerName',
      cell: ({ row }) => {
        const c = row.original;
        const name = c.CustomerName || 'Unknown';
        const mob = c.Mobile || c.MobileNo || '';
        return (
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 font-bold text-white text-xs uppercase">
              {name.charAt(0)}
            </div>
            <div>
              <div className="font-bold text-slate-900 capitalize">{name}</div>
              <div className="text-xs text-slate-700 font-bold font-mono">{mob}</div>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Self Comm',
      accessorKey: 'IsSelfComm',
      cell: ({ row }) => {
        const c = row.original;
        const isSelf = c.IsSelfComm === 'True' || c.IsSelfComm === 1 || c.IsSelfComm === true;
        return (
          <Button
            size="sm"
            variant={isSelf ? 'success' : 'outline'}
            onClick={() => handleToggleFlag(c.CID, 'IsSelfComm', c.IsSelfComm)}
          >
            {isSelf ? 'Yes' : 'No'}
          </Button>
        );
      },
    },
    {
      header: 'Yantri To',
      accessorKey: 'IsYantriTo',
      cell: ({ row }) => {
        const c = row.original;
        const isYantri = c.IsYantriTo === 'True' || c.IsYantriTo === 1 || c.IsYantriTo === true;
        return (
          <Button
            size="sm"
            variant={isYantri ? 'success' : 'outline'}
            onClick={() => handleToggleFlag(c.CID, 'IsYantriTo', c.IsYantriTo)}
          >
            {isYantri ? 'Yes' : 'No'}
          </Button>
        );
      },
    },
    ...(isSuperAdmin
      ? [
          {
            header: 'Status',
            accessorKey: 'Mobile',
            cell: ({ row }) => {
              const mob = row.original.Mobile || row.original.MobileNo;
              const status = activeStatusMap[mob];
              const isActive = status && (status.IsActive === 'True' || status.IsActive === true);
              if (!status) return <span className="text-xs text-slate-400">No login</span>;

              return (
                <Button
                  size="sm"
                  variant={isActive ? 'success' : 'danger'}
                  onClick={() => handleToggleActiveStatus(mob, isActive)}
                >
                  {isActive ? 'Active' : 'Disabled'}
                </Button>
              );
            },
          },
        ]
      : []),
    {
      header: 'Actions',
      id: 'actions',
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="flex items-center gap-2">
            <Button size="icon-sm" variant="outline" onClick={() => handleSelectCustomer(c)}>
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleShowRates(c.CID, c.CustomerName)}
              leftIcon={<Percent className="h-3.5 w-3.5" />}
            >
              Rates
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contacts & Rates Management"
        description="Create customer profiles, set default rates, 3rd party commission structures, and status flags."
        actions={
          <Button variant="outline" onClick={() => setHideList(!hideList)}>
            {hideList ? 'Show Contacts Table' : 'Hide Contacts Table'}
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form Panel */}
        <div className={hideList ? 'lg:col-span-12' : 'lg:col-span-5'}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-slate-900 font-extrabold">
                {cid ? 'Edit Contact' : 'New Contact'}
              </CardTitle>
              {cid && (
                <Button variant="success" size="sm" onClick={handleResetForm} leftIcon={<Plus className="h-3.5 w-3.5" />}>
                  New Contact
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-3.5">
              <FormRow label="Contact Name">
                <Input
                  placeholder="Enter Name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="font-semibold text-slate-900"
                />
              </FormRow>

              <FormRow label="Mobile">
                <Input
                  placeholder="10 digit Mobile"
                  maxLength={10}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/[^0-9]/g, ''))}
                  disabled={!!cid}
                  className="font-semibold text-slate-900"
                />
              </FormRow>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                <FormRow label="D Comm %">
                  <Input type="number" value={dPComm} onChange={(e) => setDPComm(e.target.value)} disabled={ratesReadonly} className="font-bold text-slate-900" />
                </FormRow>
                <FormRow label="D Amt">
                  <Input type="number" value={dAmt} onChange={(e) => setDAmt(e.target.value)} disabled={ratesReadonly} className="font-bold text-slate-900" />
                </FormRow>
                <FormRow label="A Comm %">
                  <Input type="number" value={aPComm} onChange={(e) => setAPComm(e.target.value)} disabled={ratesReadonly} className="font-bold text-slate-900" />
                </FormRow>
                <FormRow label="A Amt">
                  <Input type="number" value={aAmt} onChange={(e) => setAAmt(e.target.value)} disabled={ratesReadonly} className="font-bold text-slate-900" />
                </FormRow>
                <FormRow label="Patti %">
                  <Input type="number" value={patti} onChange={(e) => setPatti(e.target.value)} disabled={ratesReadonly} className="font-bold text-slate-900" />
                </FormRow>
                <FormRow label="LC %">
                  <Input type="number" value={lc} onChange={(e) => setLc(e.target.value)} className="font-bold text-slate-900" />
                </FormRow>
              </div>

              {/* 3rd Party Settings Header */}
              <div className="pt-2.5 border-t border-slate-200">
                <span className="text-xs font-extrabold uppercase tracking-wider text-blue-700">
                  3rd Party Commission Rules
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                <FormRow label="Hissa Party" className="sm:col-span-2">
                  <Select value={hissaPartyID} onChange={(e) => setHissaPartyID(e.target.value)} className="font-semibold text-slate-900">
                    <option value="0">Select Customer Name</option>
                    {contacts.map((c) => (
                      <option value={c.CID} key={c.CID}>
                        {c.CustomerName}
                      </option>
                    ))}
                  </Select>
                </FormRow>
                <FormRow label="Hissa %">
                  <Input type="number" value={hissaPer} onChange={(e) => setHissaPer(e.target.value)} className="font-bold text-slate-900" />
                </FormRow>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                <FormRow label="Comm Party" className="sm:col-span-2">
                  <Select value={commPartyID} onChange={(e) => setCommPartyID(e.target.value)} className="font-semibold text-slate-900">
                    <option value="0">Select Customer</option>
                    {contacts.map((c) => (
                      <option value={c.CID} key={c.CID}>
                        {c.CustomerName}
                      </option>
                    ))}
                  </Select>
                </FormRow>
                <FormRow label="Dara %">
                  <Input type="number" value={daraCommPer} onChange={(e) => setDaraCommPer(e.target.value)} className="font-bold text-slate-900" />
                </FormRow>
                <FormRow label="Akhar %">
                  <Input type="number" value={akharCommPer} onChange={(e) => setAkharCommPer(e.target.value)} className="font-bold text-slate-900" />
                </FormRow>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                <FormRow label="LC Party" className="sm:col-span-2">
                  <Select value={lcPartyID} onChange={(e) => setLcPartyID(e.target.value)} className="font-semibold text-slate-900">
                    <option value="0">Select Customer</option>
                    {contacts.map((c) => (
                      <option value={c.CID} key={c.CID}>
                        {c.CustomerName}
                      </option>
                    ))}
                  </Select>
                </FormRow>
                <FormRow label="LC %">
                  <Input type="number" value={lcCommPer} onChange={(e) => setLcCommPer(e.target.value)} className="font-bold text-slate-900" />
                </FormRow>
              </div>

              {/* Checkbox Flags */}
              <div className="flex flex-wrap gap-x-5 gap-y-2 pt-2 border-t border-slate-200">
                <Checkbox label="Self Commission" checked={selfComm} onChange={(e) => setSelfComm(e.target.checked)} />
                <Checkbox label="Yantri To" checked={yantriTo} onChange={(e) => setYantriTo(e.target.checked)} />
                <Checkbox label="Limit" checked={isLimit} onChange={(e) => setIsLimit(e.target.checked)} />
                <Checkbox label="Uttar" checked={isUttar} onChange={(e) => setIsUttar(e.target.checked)} />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
                <Button className="flex-1 font-bold uppercase tracking-wider" isLoading={savingContact} onClick={handleSaveContact}>
                  {cid ? 'Update Contact' : 'Save'}
                </Button>
                {cid && (
                  <Button variant="danger" onClick={handleDeleteCustomer} leftIcon={<Trash2 className="h-4 w-4" />}>
                    Delete
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Contacts Table */}
        {!hideList && (
          <div className="lg:col-span-7">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-slate-900 font-extrabold">
                    Contacts Directory ({filteredContacts.length})
                  </CardTitle>
                  {isSuperAdmin && activeFilter !== 'all' && (
                    <button
                      onClick={() => setActiveFilter('all')}
                      className="text-xs font-bold text-blue-700 underline underline-offset-2 hover:text-blue-800"
                    >
                      View All
                    </button>
                  )}
                </div>
                {isSuperAdmin && (
                  <div className="flex items-center gap-4 text-sm font-bold">
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-800">
                      <input
                        type="radio"
                        name="activeFilter"
                        checked={activeFilter === 'active'}
                        onChange={() => setActiveFilter('active')}
                        className="h-3.5 w-3.5 accent-emerald-600"
                      />
                      Active
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-800">
                      <input
                        type="radio"
                        name="activeFilter"
                        checked={activeFilter === 'inactive'}
                        onChange={() => setActiveFilter('inactive')}
                        className="h-3.5 w-3.5 accent-rose-600"
                      />
                      Deactivate
                    </label>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={columns}
                  data={filteredContacts}
                  isLoading={loadingContacts}
                  searchPlaceholder="Filter contacts directory..."
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Manage Rates Modal */}
      <Dialog
        isOpen={!!selectedContactRates}
        onClose={() => setSelectedContactRates(null)}
        title={`Manage Rates: ${selectedContactRates?.name}`}
        description="Add multiple rate options for this customer."
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Input label="D Comm (%)" type="number" value={rD_PComm} onChange={(e) => setRD_PComm(e.target.value)} />
            <Input label="D Amt" type="number" value={rD_Amt} onChange={(e) => setRD_Amt(e.target.value)} />
            <Input label="A Comm (%)" type="number" value={rA_PComm} onChange={(e) => setRA_PComm(e.target.value)} />
            <Input label="A Amt" type="number" value={rA_Amt} onChange={(e) => setRA_Amt(e.target.value)} />
            <Input label="Patti (%)" type="number" value={rPatti} onChange={(e) => setRPatti(e.target.value)} />
          </div>

          <div className="flex justify-end gap-2">
            <Button onClick={handleSaveRate} isLoading={savingRate}>
              {editingRate ? 'Update Rate' : 'Add Rate'}
            </Button>
            {editingRate && (
              <Button variant="danger" onClick={handleDeleteRate}>
                Delete
              </Button>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100">
            {loadingRates ? (
              <LoadingSpinner text="Fetching rates..." />
            ) : ratesList.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-4">No custom rates added yet.</p>
            ) : (
              <div className="space-y-2">
                {ratesList.map((d, i) => (
                  <div
                    key={d.RateID || i}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900 mr-2">#{i + 1}</span>
                      <span className="font-semibold text-blue-600">
                        {d.D_PComm}/{d.D_Amt}-{d.A_PComm}/{d.A_Amt}-{d.Patti}
                      </span>
                    </div>
                    <Button size="icon-sm" variant="outline" onClick={() => { setRateID(d.RateID); setRD_PComm(d.D_PComm); setRD_Amt(d.D_Amt); setRA_PComm(d.A_PComm); setRA_Amt(d.A_Amt); setRPatti(d.Patti); setEditingRate(true); }}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Dialog>
    </div>
  );
}
