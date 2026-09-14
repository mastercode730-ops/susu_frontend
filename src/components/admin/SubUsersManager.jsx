'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Users, Edit2, Shield, Lock, Smartphone, CheckCircle2 } from 'lucide-react';
import { API } from '../../utils/api';
import { showToast } from '../../utils/toast';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { Button } from '../ui/button';
import { DataTable } from '../tables/DataTable';
import { StatusBadge } from '../ui/badge';

export function SubUsersManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [subID, setSubID] = useState('');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [originalIsActive, setOriginalIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [errName, setErrName] = useState(false);
  const [errMobile, setErrMobile] = useState(false);
  const [errPwd, setErrPwd] = useState(false);

  const nameInputRef = useRef(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const r = await API.get('/sapi/admin/subusers');
      if (r && r.success) {
        setUsers(r.data || []);
      }
    } catch (e) {
      console.error(e);
      showToast('Error loading subusers', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleSaveSubUser = async () => {
    setErrName(!name.trim());
    setErrMobile(!mobile.trim());
    setErrPwd(!password.trim());

    if (!name.trim() || !mobile.trim() || !password.trim()) {
      return;
    }

    setSubmitting(true);
    const body = {
      name: name.trim(),
      mobile: mobile.trim(),
      password: password.trim(),
      isActive,
    };

    try {
      let r;
      if (subID) {
        r = await API.put(`/sapi/admin/subusers/${subID}`, body);
      } else {
        r = await API.post('/sapi/admin/subusers', body);
      }

      if (r && r.success) {
        let message = 'Sub User created successfully!';
        if (subID) {
          if (originalIsActive && !isActive) message = 'Sub User deactivated!';
          else if (!originalIsActive && isActive) message = 'Sub User activated!';
          else message = 'Sub User updated successfully!';
        }
        showToast(message);
        handleCancel();
        await loadUsers();
      } else {
        showToast('Something Went Wrong!', 'error');
      }
    } catch (e) {
      showToast('Error connecting server', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditUser = (u) => {
    const active = u.IsActive === 'True' || u.IsActive === true;
    setSubID(u.SubUserID);
    setName(u.subusername || '');
    setMobile(u.Mobile || '');
    setPassword(u.Password || '');
    setIsActive(active);
    setOriginalIsActive(active);

    setErrName(false);
    setErrMobile(false);
    setErrPwd(false);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setSubID('');
    setName('');
    setMobile('');
    setPassword('');
    setIsActive(true);
    setOriginalIsActive(true);
    setErrName(false);
    setErrMobile(false);
    setErrPwd(false);
  };

  const columns = [
    {
      header: 'SubUser ID',
      accessorKey: 'SubUserID',
      cell: ({ row }) => <span className="font-bold text-xs font-mono">{row.original.SubUserID}</span>,
    },
    {
      header: 'Name',
      accessorKey: 'subusername',
      cell: ({ row }) => (
        <span className="font-bold text-xs capitalize text-slate-900">
          {row.original.subusername || '-'}
        </span>
      ),
    },
    {
      header: 'Mobile',
      accessorKey: 'Mobile',
      cell: ({ row }) => <span className="text-xs text-slate-500 font-mono">{row.original.Mobile || '-'}</span>,
    },
    {
      header: 'Password',
      accessorKey: 'Password',
      cell: ({ row }) => <span className="text-xs font-mono">{row.original.Password || '-'}</span>,
    },
    {
      header: 'Status',
      accessorKey: 'IsActive',
      cell: ({ row }) => {
        const active = row.original.IsActive === 'True' || row.original.IsActive === true;
        return <StatusBadge status={active ? 'active' : 'inactive'} />;
      },
    },
    {
      header: 'Actions',
      id: 'actions',
      cell: ({ row }) => (
        <Button size="icon-sm" variant="outline" onClick={() => handleEditUser(row.original)}>
          <Edit2 className="h-3.5 w-3.5" />
        </Button>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6">
      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>{subID ? 'Update Sub User' : 'Create New Sub User'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Full Name"
              placeholder="Enter Staff Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errName ? 'Name required' : undefined}
              leftIcon={<Users className="h-4 w-4" />}
              ref={nameInputRef}
            />
            <Input
              label="Mobile Number"
              placeholder="10 digit Mobile"
              maxLength={10}
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/[^0-9]/g, ''))}
              error={errMobile ? 'Mobile required' : undefined}
              leftIcon={<Smartphone className="h-4 w-4" />}
            />
            <Input
              label="Password"
              placeholder="Set Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errPwd ? 'Password required' : undefined}
              leftIcon={<Lock className="h-4 w-4" />}
            />
          </div>

          <div className="pt-2">
            <Checkbox label="Account Active" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
            <Button variant="primary" className="font-bold uppercase tracking-wider" onClick={handleSaveSubUser} isLoading={submitting} leftIcon={<CheckCircle2 className="h-4 w-4" />}>
              {subID ? 'UPDATE SUB USER' : 'SAVE SUB USER'}
            </Button>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Directory Card */}
      <Card>
        <CardHeader>
          <CardTitle>All Configured Staff Accounts ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={users}
            isLoading={loading}
            searchPlaceholder="Search staff by name or mobile..."
          />
        </CardContent>
      </Card>
    </div>
  );
}
