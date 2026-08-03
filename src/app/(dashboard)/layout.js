'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DashboardLayout({ children }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Toggle mobile sidebar
  const toggleMobileNav = () => {
    const nextState = !mobileNavOpen;
    setMobileNavOpen(nextState);
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('nav_open', nextState);
    }
  };

  // Close sidebar on link tap
  const closeMobileNav = () => {
    setMobileNavOpen(false);
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('nav_open');
    }
  };

  useEffect(() => {
    return () => {
      // Cleanup class on unmount
      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('nav_open');
      }
    };
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#f4f6f9' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', borderColor: 'rgba(18,140,126,0.2)', borderTopColor: '#128c7e' }}></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect via AuthContext
  }

  // Sidebar visibility flags
  const isStaff = !!user.SubUID;
  
  const showItem = (permissionKey) => {
    if (!isStaff) return true; // SuperAdmin or full owner has access to everything
    return String(user[permissionKey]) !== 'False';
  };

  const navItems = [
    { id: 'customer', href: '/customer', icon: 'fas fa-users', label: 'Add Contact', visible: showItem('ADDContacts') },
    { id: 'game', href: '/game', icon: 'fas fa-keyboard', label: 'Add Game', visible: showItem('ADDGames') },
    { id: 'results', href: '/results', icon: 'fas fa-draw-polygon', label: 'Result', visible: showItem('Result') },
    { id: 'sale-history', href: '/sale-history', icon: 'fa fa-history', label: 'Find Chat', visible: true },
    { id: 'received', href: '/received', icon: 'fas fa-inbox', label: 'Received', visible: true },
    { id: 'hisab', href: '/hisab', icon: 'fas fa-balance-scale', label: 'Hisab', visible: showItem('Hisab') },
    { id: 'hisab-summary', href: '/hisab-summary', icon: 'fas fa-balance-scale', label: 'Hisab Summary', visible: showItem('HisabSummary') },
    { id: 'date-wise', href: '/date-wise-hisab', icon: 'fas fa-calendar-alt', label: 'Date Wise Hisab', visible: showItem('DateWiseHisab') },
    { id: 'accounts', href: '/accounts', icon: 'fas fa-rupee-sign', label: 'Accounts', visible: showItem('Accounts') },
    { id: 'subusers', href: '/subusers', icon: 'fas fa-users', label: 'Sub User', visible: !isStaff },
    { id: 'balance', href: '/balance', icon: 'fas fa-hand-holding-usd', label: 'Balance', visible: showItem('Balance') },
    { id: 'staff-balance', href: '/staff-balance', icon: 'fas fa-hand-holding-usd', label: 'Sub User Balance', visible: !isStaff },
    { id: 'lc', href: '/lc', icon: 'fas fa-percent', label: 'LC', visible: showItem('LC') },
    { id: 'pl-yantri', href: '/pl-yantri', icon: 'fas fa-chart-line', label: 'P&L Yantri', visible: true },
    { id: 'yantri', href: '/yantri', icon: 'fas fa-sort-numeric-up', label: 'Yantri', visible: showItem('Yantri') },
    { id: 'absent-customers', href: '/absent-customers', icon: 'fas fa-user-times', label: 'Absent Report', visible: true },
    { id: 'assign-clients', href: '/assign-clients', icon: 'fas fa-user-friends', label: 'Assign Customer', visible: !isStaff },
    { id: 'access', href: '/access-rights', icon: 'fas fa-lock', label: 'Access Rights', visible: !isStaff },
    { id: 'change-password', href: '/change-password', icon: 'fas fa-user-lock', label: 'Change Password', visible: true }
  ];

  return (
    <div className="wrapper">
      {/* Header Panel */}
      <div className="main-header" style={{ top: 0, left: 0, right: 0 }}>
        <div className="logo-header" data-background-color="blue" style={{ display: 'flex', alignItems: 'center' }}>
          <Link href="/home" className="logo" style={{ color: 'white', textDecoration: 'none', fontWeight: 700, letterSpacing: '2px' }}>
            SUSU9
          </Link>
          
          <button 
            className={`navbar-toggler sidenav-toggler ${mobileNavOpen ? 'toggled' : ''}`} 
            type="button" 
            onClick={toggleMobileNav}
            style={{ position: 'absolute', left: '15px' }}
          >
            <span className="navbar-toggler-icon">
              <i className="icon-menu"></i>
            </span>
          </button>

          {/* Grouped Right Action Buttons for mobile */}
          <div className="header-actions-right">
            <a href="https://wa.me/+17073166800" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center' }}>
              <i className="fa fa-whatsapp" style={{ fontSize: '24px', color: 'white' }}></i>
            </a>
            <button 
              onClick={() => router.push('/home')} 
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', padding: 0, marginLeft: '15px' }}
            >
              <i className="fas fa-home" style={{ fontSize: '20px', color: 'white' }}></i>
            </button>
          </div>

          <div className="nav-toggle">
            <button className="btn btn-toggle toggle-sidebar" onClick={toggleMobileNav}>
              <i className="icon-menu"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar Panel */}
      <div className="sidebar sidebar-style-2" style={{ top: 0 }}>
        <div className="sidebar-wrapper scrollbar scrollbar-inner">
          <div className="sidebar-content">
            <div className="user">
              <div className="info">
                <a data-toggle="collapse" href="#collapseUser" aria-expanded="true">
                  <span>
                    <span style={{ fontWeight: 'bold', color: 'black' }}>{user.UID}</span>
                    {isStaff && (
                      <span className="user-level" style={{ fontWeight: 'bold', color: 'black', display: 'inline', marginTop: '2px' }}>
                        Staff: {user.SubUID}
                      </span>
                    )}
                    <span className="caret"></span>
                  </span>
                </a>
                <div className="clearfix"></div>
                <div className="collapse in" id="collapseUser">
                  <ul className="nav">
                    <li>
                      <a href="#" onClick={(e) => { e.preventDefault(); logout(); }}>
                        <span className="link-collapse" style={{ fontWeight: 'bold', color: 'black' }}>Logout</span>
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <ul className="nav nav-primary">
              <li className="mx-4 mt-2">
                <Link href="/home" onClick={closeMobileNav} className="btn btn-primary btn-block">
                  <span className="btn-label mr-2">
                    <i className="fa fa-home"></i>
                  </span>
                  Dashboard
                </Link>
              </li>
              <li className="mx-4 mt-2">
                <a className="btn btn-primary btn-block" href="https://wa.me/+17073166800" target="_blank" rel="noopener noreferrer">
                  <span className="btn-label mr-2">
                    <i className="fa fa-whatsapp"></i>
                  </span>
                  Support
                </a>
              </li>
              <li className="nav-section">
                <span className="sidebar-mini-icon">
                  <i className="fa fa-ellipsis-h"></i>
                </span>
                <h4 className="text-section" style={{ fontWeight: 'bold', color: 'Black' }}>Menu</h4>
              </li>

              {navItems.filter(item => item.visible).map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li className={`nav-item ${isActive ? 'active' : ''}`} key={item.id}>
                    <Link href={item.href} onClick={closeMobileNav}>
                      <i className={item.icon} style={{ fontWeight: 'bold', color: 'Black' }}></i>
                      <p style={{ fontWeight: 'bold', color: 'Black' }}>{item.label}</p>
                    </Link>
                  </li>
                );
              })}

              {user.SuperAdmin === 'SuperAdmin' && (
                <li className={`nav-item ${pathname?.startsWith('/admin') ? 'active' : ''}`}>
                  <Link href="/admin/dashboard" onClick={closeMobileNav}>
                    <i className="fas fa-cog" style={{ fontWeight: 'bold', color: '#ffd700' }}></i>
                    <p style={{ fontWeight: 'bold', color: '#ffd700' }}>Admin</p>
                  </Link>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Main content wrapper */}
      <div className="main-panel">
        <div className="content">
          {children}
        </div>
      </div>

      {/* Mobile Sidebar backdrop */}
      {mobileNavOpen && (
        <div className="susu9-backdrop" style={{ display: 'block' }} onClick={toggleMobileNav}></div>
      )}
      
      {/* Atlantis fixes inline style */}
      <style jsx global>{`
        .main-header { top:0 !important; left:0 !important; right:0 !important; }
        .sidebar.sidebar-style-2 { top:0 !important; }
        .susu9-backdrop { display:none; position:fixed; inset:0; z-index:998; background:rgba(0,0,0,.45); }
        html.nav_open .susu9-backdrop { display:block; }
        
        .header-actions-right { display: none; }
        @media (max-width: 991px) {
          .header-actions-right { display: flex !important; position: absolute; right: 15px; align-items: center; }
        }
      `}</style>
    </div>
  );
}
