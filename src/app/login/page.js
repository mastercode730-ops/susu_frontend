'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { User, ShieldCheck, Lock, Smartphone, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API } from '../../utils/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Dialog } from '../../components/ui/dialog';
import { Tabs } from '../../components/ui/tabs';

export default function LoginPage() {
  const { user, login, loading } = useAuth();
  const router = useRouter();

  // Tab state: 'user' or 'subuser'
  const [activeTab, setActiveTab] = useState('user');

  // Password visibility state
  const [showPassword, setShowPassword] = useState(false);

  // Input fields
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [subUserID, setSubUserID] = useState('');
  const [subPassword, setSubPassword] = useState('');

  // Status states
  const [loginErr, setLoginErr] = useState('');
  const [subLoginErr, setSubLoginErr] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [subLoginLoading, setSubLoginLoading] = useState(false);

  // Modals state: 'cp-user', 'cp-sub', 'newuser', or null
  const [activeModal, setActiveModal] = useState(null);

  // User Reset Password Modal inputs
  const [cpuMobile, setCpuMobile] = useState('');
  const [cpuCurrent, setCpuCurrent] = useState('');
  const [cpuNew, setCpuNew] = useState('');
  const [cpuConfirm, setCpuConfirm] = useState('');
  const [cpuErr, setCpuErr] = useState('');
  const [cpuSuccess, setCpuSuccess] = useState('');
  const [cpuLoading, setCpuLoading] = useState(false);

  // Staff Reset Password Modal inputs
  const [cpsID, setCpsID] = useState('');
  const [cpsCurrent, setCpsCurrent] = useState('');
  const [cpsNew, setCpsNew] = useState('');
  const [cpsConfirm, setCpsConfirm] = useState('');
  const [cpsErr, setCpsErr] = useState('');
  const [cpsSuccess, setCpsSuccess] = useState('');
  const [cpsLoading, setCpsLoading] = useState(false);

  // Registration Modal inputs
  const [nuMobile, setNuMobile] = useState('');
  const [nuPassword, setNuPassword] = useState('');
  const [nuConfirm, setNuConfirm] = useState('');
  const [nuErr, setNuErr] = useState('');
  const [nuSuccess, setNuSuccess] = useState('');
  const [nuLoading, setNuLoading] = useState(false);

  // Redirect if logged in
  useEffect(() => {
    if (user && !loading) {
      router.replace('/home');
    }
  }, [user, loading, router]);

  // Handle enter key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        if (activeModal) return;
        if (activeTab === 'user') {
          handleUserLogin();
        } else {
          handleStaffLogin();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, mobile, password, subUserID, subPassword, activeModal]);

  const handleUserLogin = async () => {
    if (!mobile || !password) {
      setLoginErr('Mobile and password required');
      return;
    }
    setLoginLoading(true);
    setLoginErr('');
    try {
      const res = await login(mobile, password, false);
      if (!res.success) {
        setLoginErr(res.message || 'Invalid credentials');
      }
    } catch (e) {
      setLoginErr('Server error. Try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleStaffLogin = async () => {
    if (!subUserID || !subPassword) {
      setSubLoginErr('SubUser ID and password required');
      return;
    }
    setSubLoginLoading(true);
    setSubLoginErr('');
    try {
      const res = await login(subUserID, subPassword, true);
      if (!res.success) {
        setSubLoginErr(res.message || 'Invalid or inactive account');
      }
    } catch (e) {
      setSubLoginErr('Server error. Try again.');
    } finally {
      setSubLoginLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setCpuErr(''); setCpuSuccess('');
    if (!cpuMobile || !cpuCurrent || !cpuNew) {
      setCpuErr('Saare fields bharna zaroori hai');
      return;
    }
    if (cpuNew !== cpuConfirm) {
      setCpuErr('New password match nahi kar raha');
      return;
    }
    setCpuLoading(true);
    try {
      const res = await API.post('/sapi/auth/reset-password', {
        mobile: cpuMobile,
        currentPassword: cpuCurrent,
        newPassword: cpuNew,
      });
      if (res.success) {
        setCpuSuccess(res.message || 'Password successfully changed!');
        setCpuCurrent(''); setCpuNew(''); setCpuConfirm('');
      } else {
        setCpuErr(res.message || 'Error resetting password');
      }
    } catch (e) {
      setCpuErr('Server error. Try again.');
    } finally {
      setCpuLoading(false);
    }
  };

  const handleResetSubPassword = async () => {
    setCpsErr(''); setCpsSuccess('');
    if (!cpsID || !cpsCurrent || !cpsNew) {
      setCpsErr('Saare fields bharna zaroori hai');
      return;
    }
    if (cpsNew !== cpsConfirm) {
      setCpsErr('New password match nahi kar raha');
      return;
    }
    setCpsLoading(true);
    try {
      const res = await API.post('/sapi/auth/reset-subuser-password', {
        subUserID: cpsID,
        currentPassword: cpsCurrent,
        newPassword: cpsNew,
      });
      if (res.success) {
        setCpsSuccess(res.message || 'Password successfully changed!');
        setCpsCurrent(''); setCpsNew(''); setCpsConfirm('');
      } else {
        setCpsErr(res.message || 'Error resetting password');
      }
    } catch (e) {
      setCpsErr('Server error. Try again.');
    } finally {
      setCpsLoading(false);
    }
  };

  const handleRegister = async () => {
    setNuErr(''); setNuSuccess('');
    if (!nuMobile || !nuPassword) {
      setNuErr('Mobile aur password required hai');
      return;
    }
    if (nuPassword !== nuConfirm) {
      setNuErr('Password match nahi kar raha');
      return;
    }
    setNuLoading(true);
    try {
      const res = await API.post('/sapi/auth/register', {
        mobile: nuMobile,
        password: nuPassword,
      });
      if (res.success) {
        setNuSuccess(res.message || 'Account created successfully! Please log in.');
        setNuMobile(''); setNuPassword(''); setNuConfirm('');
      } else {
        setNuErr(res.message || 'Registration failed');
      }
    } catch (e) {
      setNuErr('Server error. Try again.');
    } finally {
      setNuLoading(false);
    }
  };

  const closeModal = () => setActiveModal(null);

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-slate-950 px-4 py-12 overflow-hidden selection:bg-blue-500 selection:text-white">
      {/* Background Decorative Glows */}
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl"
      >
        {/* Brand Identity */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 font-black text-2xl text-white shadow-lg shadow-blue-500/25">
            S9
          </div>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-white">SUSU9</h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-slate-400">
            Game Management Platform
          </p>
        </div>

        {/* Tab Selection */}
        <div className="mt-8 flex justify-center">
          <Tabs
            tabs={[
              { id: 'user', label: 'User Login', icon: <User className="h-4 w-4" /> },
              { id: 'subuser', label: 'Staff Login', icon: <ShieldCheck className="h-4 w-4" /> },
            ]}
            activeTab={activeTab}
            onChange={(tab) => {
              setActiveTab(tab);
              setLoginErr('');
              setSubLoginErr('');
            }}
            className="w-full justify-center bg-slate-950 p-1 border border-slate-800"
          />
        </div>

        {/* User Login Form */}
        {activeTab === 'user' && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="mt-6 space-y-4"
          >
            <Input
              label="Mobile Number"
              placeholder="10 digit mobile number"
              maxLength={10}
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/[^0-9]/g, ''))}
              leftIcon={<Smartphone className="h-4 w-4" />}
            />
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="h-4 w-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="focus:outline-none text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />

            {loginErr && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-center text-xs font-medium text-red-400">
                {loginErr}
              </div>
            )}

            <Button
              variant="primary"
              size="lg"
              className="w-full font-bold uppercase tracking-wider"
              isLoading={loginLoading}
              onClick={handleUserLogin}
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              LOGIN
            </Button>

            <div className="flex items-center justify-between pt-2 text-xs">
              <button
                type="button"
                onClick={() => setActiveModal('cp-user')}
                className="font-medium text-blue-400 hover:underline"
              >
                Change Password
              </button>
              <button
                type="button"
                onClick={() => setActiveModal('newuser')}
                className="font-medium text-blue-400 hover:underline"
              >
                New User? Register
              </button>
            </div>
          </motion.div>
        )}

        {/* Staff/SubUser Login Form */}
        {activeTab === 'subuser' && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="mt-6 space-y-4"
          >
            <Input
              label="Staff / Sub User ID"
              placeholder="Enter SubUser ID"
              value={subUserID}
              onChange={(e) => setSubUserID(e.target.value)}
              leftIcon={<User className="h-4 w-4" />}
            />
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter password"
              value={subPassword}
              onChange={(e) => setSubPassword(e.target.value)}
              leftIcon={<Lock className="h-4 w-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="focus:outline-none text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />

            {subLoginErr && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-center text-xs font-medium text-red-400">
                {subLoginErr}
              </div>
            )}

            <Button
              variant="primary"
              size="lg"
              className="w-full font-bold uppercase tracking-wider"
              isLoading={subLoginLoading}
              onClick={handleStaffLogin}
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              STAFF LOGIN
            </Button>

            <div className="flex items-center justify-between pt-2 text-xs">
              <button
                type="button"
                onClick={() => setActiveModal('cp-sub')}
                className="font-medium text-blue-400 hover:underline"
              >
                Change Password
              </button>
            </div>
          </motion.div>
        )}

        <div className="mt-8 border-t border-slate-800 pt-4 text-center text-[11px] text-slate-500">
          © 2025 Susu9 Platform &nbsp;•&nbsp; Enterprise Security
        </div>
      </motion.div>

      {/* User Change Password Modal */}
      <Dialog
        isOpen={activeModal === 'cp-user'}
        onClose={closeModal}
        title="User Password Change"
        description="Verify mobile number & current password to reset."
      >
        <div className="space-y-4">
          <Input
            label="Mobile Number"
            placeholder="10 digit mobile number"
            maxLength={10}
            value={cpuMobile}
            onChange={(e) => setCpuMobile(e.target.value.replace(/[^0-9]/g, ''))}
          />
          <Input
            label="Current Password"
            type="password"
            placeholder="Current password"
            value={cpuCurrent}
            onChange={(e) => setCpuCurrent(e.target.value)}
          />
          <Input
            label="New Password"
            type="password"
            placeholder="New password"
            value={cpuNew}
            onChange={(e) => setCpuNew(e.target.value)}
          />
          <Input
            label="Confirm New Password"
            type="password"
            placeholder="Re-enter new password"
            value={cpuConfirm}
            onChange={(e) => setCpuConfirm(e.target.value)}
          />
          {cpuErr && <p className="text-xs font-semibold text-red-500">{cpuErr}</p>}
          {cpuSuccess && <p className="text-xs font-semibold text-emerald-500">{cpuSuccess}</p>}
          <Button className="w-full" isLoading={cpuLoading} onClick={handleResetPassword}>
            CHANGE PASSWORD
          </Button>
        </div>
      </Dialog>

      {/* Staff Change Password Modal */}
      <Dialog
        isOpen={activeModal === 'cp-sub'}
        onClose={closeModal}
        title="Staff Password Change"
        description="Verify SubUser ID & current password to reset."
      >
        <div className="space-y-4">
          <Input
            label="Sub User ID"
            placeholder="Enter SubUser ID"
            value={cpsID}
            onChange={(e) => setCpsID(e.target.value)}
          />
          <Input
            label="Current Password"
            type="password"
            placeholder="Current password"
            value={cpsCurrent}
            onChange={(e) => setCpsCurrent(e.target.value)}
          />
          <Input
            label="New Password"
            type="password"
            placeholder="New password"
            value={cpsNew}
            onChange={(e) => setCpsNew(e.target.value)}
          />
          <Input
            label="Confirm New Password"
            type="password"
            placeholder="Re-enter new password"
            value={cpsConfirm}
            onChange={(e) => setCpsConfirm(e.target.value)}
          />
          {cpsErr && <p className="text-xs font-semibold text-red-500">{cpsErr}</p>}
          {cpsSuccess && <p className="text-xs font-semibold text-emerald-500">{cpsSuccess}</p>}
          <Button className="w-full" isLoading={cpsLoading} onClick={handleResetSubPassword}>
            CHANGE PASSWORD
          </Button>
        </div>
      </Dialog>

      {/* New User Registration Modal */}
      <Dialog
        isOpen={activeModal === 'newuser'}
        onClose={closeModal}
        title="New User Registration"
        description="Create your account to access the Susu9 platform."
      >
        <div className="space-y-4">
          <Input
            label="Mobile Number"
            placeholder="10 digit mobile number"
            maxLength={10}
            value={nuMobile}
            onChange={(e) => setNuMobile(e.target.value.replace(/[^0-9]/g, ''))}
          />
          <Input
            label="Password"
            type="password"
            placeholder="Choose password"
            value={nuPassword}
            onChange={(e) => setNuPassword(e.target.value)}
          />
          <Input
            label="Confirm Password"
            type="password"
            placeholder="Re-enter password"
            value={nuConfirm}
            onChange={(e) => setNuConfirm(e.target.value)}
          />
          {nuErr && <p className="text-xs font-semibold text-red-500">{nuErr}</p>}
          {nuSuccess && <p className="text-xs font-semibold text-emerald-500">{nuSuccess}</p>}
          <Button className="w-full" isLoading={nuLoading} onClick={handleRegister}>
            CREATE ACCOUNT
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
