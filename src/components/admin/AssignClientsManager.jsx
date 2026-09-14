'use client';

import React, { useState, useEffect } from 'react';
import { Search, Save } from 'lucide-react';
import { API } from '../../utils/api';
import { showToast } from '../../utils/toast';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Button } from '../ui/button';
import { DataTable } from '../tables/DataTable';

export function AssignClientsManager() {
  const [loading, setLoading] = useState(false);
  const [subusers, setSubusers] = useState([]);
  const [selectedSubUserId, setSelectedSubUserId] = useState('');

  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [filterText, setFilterText] = useState('');
  const [selectAll, setSelectAll] = useState(false);

  const loadSubUsers = async () => {
    try {
      const r = await API.get('/sapi/admin/subusers');
      if (r && r.success) {
        setSubusers(r.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadSubUsers();
  }, []);

  const handleUserChange = async (uid) => {
    setSelectedSubUserId(uid);
    setFilterText('');
    setSelectAll(false);
    setClients([]);
    setFilteredClients([]);

    if (!uid) return;

    setLoading(true);
    try {
      const r = await API.get(`/sapi/admin/assign-clients?staffID=${uid}`);
      if (r && r.success) {
        const data = r.data || [];
        setClients(data);
        setFilteredClients(data);
      }
    } catch (e) {
      console.error(e);
      showToast('Error loading clients list', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const query = e.target.value;
    setFilterText(query);
    if (!query.trim()) {
      setFilteredClients(clients);
    } else {
      setFilteredClients(
        clients.filter((c) => (c.CustomerName || '').toLowerCase().includes(query.toLowerCase()))
      );
    }
  };

  const handleCheckboxChange = (cid) => {
    const updated = clients.map((c) => (String(c.CID) === String(cid) ? { ...c, IsAssigned: !c.IsAssigned } : c));
    setClients(updated);

    if (!filterText.trim()) {
      setFilteredClients(updated);
    } else {
      setFilteredClients(updated.filter((c) => (c.CustomerName || '').toLowerCase().includes(filterText.toLowerCase())));
    }
  };

  const handleSelectAllToggle = (e) => {
    const nextVal = e.target.checked;
    setSelectAll(nextVal);
    const updated = clients.map((c) => ({ ...c, IsAssigned: nextVal }));
    setClients(updated);

    if (!filterText.trim()) {
      setFilteredClients(updated);
    } else {
      setFilteredClients(updated.filter((c) => (c.CustomerName || '').toLowerCase().includes(filterText.toLowerCase())));
    }
  };

  const handleSaveAssignments = async () => {
    if (!selectedSubUserId) {
      showToast('Please select a staff sub-user', 'error');
      return;
    }

    const assignedCIDs = clients
      .filter((c) => c.IsAssigned === true || c.IsAssigned === 1 || c.IsAssigned === 'True')
      .map((c) => c.CID);

    try {
      const r = await API.post('/sapi/admin/assign-clients', {
        staffID: selectedSubUserId,
        customerIDs: assignedCIDs,
      });

      if (r && r.success) {
        showToast('Assignments updated successfully!');
        handleUserChange(selectedSubUserId);
      } else {
        showToast(r?.message || 'Error updating assignments', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Connection error updating assignments', 'error');
    }
  };

  const columns = [
    {
      header: ({ table }) => (
        <Checkbox checked={selectAll} onChange={handleSelectAllToggle} />
      ),
      id: 'select',
      cell: ({ row }) => {
        const assigned = row.original.IsAssigned === true || row.original.IsAssigned === 'True' || row.original.IsAssigned === 1;
        return <Checkbox checked={assigned} onChange={() => handleCheckboxChange(row.original.CID)} />;
      },
    },
    {
      header: 'Customer Name',
      accessorKey: 'CustomerName',
      cell: ({ row }) => <span className="font-bold text-xs capitalize text-slate-900">{row.original.CustomerName || row.original.CID}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Select Staff Sub-User" value={selectedSubUserId} onChange={(e) => handleUserChange(e.target.value)}>
              <option value="">Choose Staff User...</option>
              {subusers.map((u) => (
                <option key={u.SubUserID} value={u.SubUserID}>
                  {u.subusername || u.SubUserID}
                </option>
              ))}
            </Select>
            <Input label="Filter Customer" placeholder="Search customer name..." value={filterText} onChange={handleFilterChange} leftIcon={<Search className="h-4 w-4" />} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle>Assignable Customers Directory ({filteredClients.length})</CardTitle>
          <Button onClick={handleSaveAssignments} leftIcon={<Save className="h-4 w-4" />}>
            SAVE ASSIGNMENTS
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={filteredClients} isLoading={loading} searchPlaceholder="Filter customers..." />
        </CardContent>
      </Card>
    </div>
  );
}
