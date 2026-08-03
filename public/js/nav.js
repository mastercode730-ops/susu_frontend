// ═══════════════════════════════════════════════════════════
// nav.js — Shared Atlantis-theme sidebar/header shell for all pages
// Dynamically loads the vendored Atlantis theme assets, wraps the
// page's own content into the theme's wrapper/main-panel structure,
// and applies subuser access-control (hiding restricted nav items).
// ═══════════════════════════════════════════════════════════

const ATLANTIS_CSS = [
  '/vendor/assets/css/bootstrap.min.css',
  '/vendor/assets/css/atlantis.min.css',
  '/vendor/fonts/font-awesome-4.7.0/css/font-awesome.min.css',
  '/vendor/Select/select2.css',
  '/css/polish.css'  // readability layer — must come after the theme
];

const ATLANTIS_JS = [
  '/vendor/assets/js/core/jquery.3.2.1.min.js',
  '/vendor/assets/js/core/popper.min.js',
  '/vendor/assets/js/core/bootstrap.min.js',
  '/vendor/assets/js/plugin/jquery-ui-1.12.1.custom/jquery-ui.min.js',
  '/vendor/assets/js/plugin/jquery-ui-touch-punch/jquery.ui.touch-punch.min.js',
  '/vendor/assets/js/plugin/jquery-scrollbar/jquery.scrollbar.min.js',
  '/vendor/assets/js/plugin/chart.js/chart.min.js',
  '/vendor/assets/js/plugin/jquery.sparkline/jquery.sparkline.min.js',
  '/vendor/assets/js/plugin/chart-circle/circles.min.js',
  '/vendor/assets/js/plugin/datatables/datatables.min.js',
  '/vendor/assets/js/plugin/bootstrap-notify/bootstrap-notify.min.js',
  '/vendor/assets/js/plugin/jqvmap/jquery.vmap.min.js',
  '/vendor/assets/js/plugin/jqvmap/maps/jquery.vmap.world.js',
  '/vendor/assets/js/plugin/sweetalert/sweetalert.min.js',
  '/vendor/assets/js/atlantis.min.js',
  '/vendor/Select/select2.js'
];

function _loadCss(href) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

function _loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Failed to load ' + src));
    document.head.appendChild(script);
  });
}

let _vendorLoadPromise = null;
function loadVendorAssets() {
  if (_vendorLoadPromise) return _vendorLoadPromise;
  ATLANTIS_CSS.forEach(_loadCss);
  _vendorLoadPromise = ATLANTIS_JS.reduce(
    (chain, src) => chain.then(() => _loadScript(src)),
    Promise.resolve()
  );
  return _vendorLoadPromise;
}

// Atlantis's .main-header relies on position:fixed with no explicit `top`
// (it assumes it's always the very first element painted in the document,
// so the browser's auto-computed static position happens to be 0). That
// assumption doesn't hold reliably once the shell is injected dynamically
// after the page's own content has already been parsed, so pin it explicitly.
function _injectShellFixCss() {
  if (document.getElementById('susu9-shell-fix')) return;
  const style = document.createElement('style');
  style.id = 'susu9-shell-fix';
  style.textContent = `
    .main-header { top:0 !important; left:0 !important; right:0 !important; }
    .sidebar.sidebar-style-2 { top:0 !important; }
    .susu9-backdrop { display:none; position:fixed; inset:0; z-index:998; background:rgba(0,0,0,.45); }
    html.nav_open .susu9-backdrop { display:block; }
  `;
  document.head.appendChild(style);
}

// Atlantis's own sidebar-toggle click handler only toggles a `nav_open` class
// on <html>, which translates .main-header/.main-panel sideways to reveal the
// sidebar underneath — on phone-width screens (<992px) that leaves a slim
// strip of the still-live, still-tappable page visible next to the open menu,
// with no dimming and no way to tap-away to close it. Atlantis ships no
// backdrop element for this, so add one ourselves.
function _initMobileSidebarBackdrop() {
  if (document.querySelector('.susu9-backdrop')) return;
  const backdrop = document.createElement('div');
  backdrop.className = 'susu9-backdrop';
  document.body.appendChild(backdrop);

  const closeSidebar = () => {
    document.documentElement.classList.remove('nav_open');
    document.querySelectorAll('.sidenav-toggler, .toggle-sidebar').forEach(b => b.classList.remove('toggled'));
  };

  backdrop.addEventListener('click', closeSidebar);

  // Auto-close after tapping a nav link (mobile only — desktop sidebar is
  // always visible so nav_open never applies there).
  document.addEventListener('click', (e) => {
    if (window.innerWidth >= 992) return;
    if (!document.documentElement.classList.contains('nav_open')) return;
    if (e.target.closest('.sidebar a')) closeSidebar();
  });
}

// ── Sidebar + header shell markup (mirrors Susu9/Application/site.master) ──
function renderShell(active) {
  const item = (id, href, icon, label) => `
        <li class="nav-item ${active === id ? 'active' : ''}" id="nav-${id}">
          <a href="${href}">
            <i class="${icon}" style="font-weight:bold;color:Black;"></i>
            <p style="font-weight:bold;color:Black;">${label}</p>
          </a>
        </li>`;

  return `
  <div class="main-header">
    <div class="logo-header" data-background-color="blue">
      <a href="/pages/home.html" class="logo" style="color:white;text-decoration:none;font-weight:700;letter-spacing:2px;">SUSU9</a>
      <button class="navbar-toggler sidenav-toggler ml-auto" type="button" data-toggle="collapse" aria-expanded="false" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"><i class="icon-menu"></i></span>
      </button>
      <button class="more"><a href="https://wa.me/+17073166800" target="_blank"><i class="fa fa-whatsapp" style="font-size:26px;color:white;"></i></a></button>
      <button class="more" onclick="location.href='/pages/home.html'"><i class="fas fa-home" style="color:white;"></i></button>
      <div class="nav-toggle"><button class="btn btn-toggle toggle-sidebar"><i class="icon-menu"></i></button></div>
    </div>
  </div>
  <div class="sidebar sidebar-style-2">
    <div class="sidebar-wrapper scrollbar scrollbar-inner">
      <div class="sidebar-content">
        <div class="user">
          <div class="info">
            <a data-toggle="collapse" href="#collapseUser" aria-expanded="true">
              <span>
                <span id="navUID" style="font-weight:bold;color:black;"></span>
                <span class="user-level" id="navSubUID" style="font-weight:bold;color:black;display:none;"></span>
                <span class="caret"></span>
              </span>
            </a>
            <div class="clearfix"></div>
            <div class="collapse in" id="collapseUser">
              <ul class="nav">
                <li><a href="#" onclick="doLogout();return false;"><span class="link-collapse" style="font-weight:bold;color:black;">Logout</span></a></li>
              </ul>
            </div>
          </div>
        </div>
        <ul class="nav nav-primary">
          <li class="mx-4 mt-2">
            <a href="/pages/home.html" class="btn btn-primary btn-block"><span class="btn-label mr-2"><i class="fa fa-home"></i></span>Dashboard</a>
          </li>
          <li class="mx-4 mt-2">
            <a class="btn btn-primary btn-block" href="https://wa.me/+17073166800" target="_blank"><span class="btn-label mr-2"><i class="fa fa-whatsapp"></i></span>Support</a>
          </li>
          <li class="nav-section">
            <span class="sidebar-mini-icon"><i class="fa fa-ellipsis-h"></i></span>
            <h4 class="text-section" style="font-weight:bold;color:Black;">Menu</h4>
          </li>
          ${item('customer', '/pages/customer.html', 'fas fa-users', 'Add Contact')}
          ${item('game', '/pages/game.html', 'fas fa-keyboard', 'Add Game')}
          ${item('results', '/pages/results.html', 'fas fa-draw-polygon', 'Result')}
          ${item('sale-history', '/pages/sale-history.html', 'fa fa-history', 'Find Chat')}
          ${item('received', '/pages/received.html', 'fas fa-inbox', 'Received')}
          ${item('hisab', '/pages/hisab.html', 'fas fa-balance-scale', 'Hisab')}
          ${item('hisab-summary', '/pages/hisab-summary.html', 'fas fa-balance-scale', 'Hisab Summary')}
          ${item('date-wise', '/pages/date-wise-hisab.html', 'fas fa-calendar-alt', 'Date Wise Hisab')}
          ${item('accounts', '/pages/accounts.html', 'fas fa-rupee-sign', 'Accounts')}
          ${item('subusers', '/pages/subusers.html', 'fas fa-users', 'Sub User')}
          ${item('balance', '/pages/balance.html', 'fas fa-hand-holding-usd', 'Balance')}
          ${item('staff-balance', '/pages/staff-balance.html', 'fas fa-hand-holding-usd', 'Sub User Balance')}
          ${item('lc', '/pages/lc.html', 'fas fa-percent', 'LC')}
          ${item('pl-yantri', '/pages/pl-yantri.html', 'fas fa-chart-line', 'P&L Yantri')}
          ${item('yantri', '/pages/yantri.html', 'fas fa-sort-numeric-up', 'Yantri')}
          ${item('absent-customers', '/pages/absent-customers.html', 'fas fa-user-times', 'Absent Report')}
          ${item('assign-clients', '/pages/assign-clients.html', 'fas fa-user-friends', 'Assign Customer')}
          ${item('access', '/pages/access-rights.html', 'fas fa-lock', 'Access Rights')}
          ${item('change-password', '/pages/change-password.html', 'fas fa-user-lock', 'Change Password')}
          <li class="nav-item" id="nav-admin" style="display:none;">
            <a href="/pages/admin/dashboard.html">
              <i class="fas fa-cog" style="font-weight:bold;color:#ffd700;"></i>
              <p style="font-weight:bold;color:#ffd700;">Admin</p>
            </a>
          </li>
        </ul>
      </div>
    </div>
  </div>`;
}

function loadThemeFonts() {
  _loadScript('/vendor/assets/js/plugin/webfont/webfont.min.js').then(() => {
    if (typeof WebFont === 'undefined') return;
    WebFont.load({
      google: { families: ['Lato:300,400,700,900'] },
      custom: {
        families: ['Flaticon', 'Font Awesome 5 Solid', 'Font Awesome 5 Regular', 'Font Awesome 5 Brands', 'simple-line-icons'],
        urls: ['/vendor/assets/css/fonts.min.css']
      }
    });
  });
}

// ── initPage — inject shell first (so theme JS initializes against real DOM),
// load theme assets, then apply access control ──
async function initPage(active) {
  // Done BEFORE loading vendor JS so atlantis.min.js's ready-handlers
  // (sidebar toggle, scrollbar init) bind to elements that actually exist.
  _wrapPageContent(renderShell(active));

  loadThemeFonts();
  await loadVendorAssets();
  _initMobileSidebarBackdrop();

  try {
    const r = await API.get('/api/auth/me');
    if (!r || !r.success) { window.location.href = '/login.html'; return null; }
    const u = r.user;

    const navUID = document.getElementById('navUID');
    if (navUID) navUID.textContent = u.UID || '';

    if (u.SubUID) {
      // Staff/subuser
      const sub = document.getElementById('navSubUID');
      if (sub) { sub.textContent = 'Staff: ' + u.SubUID; sub.style.display = 'inline'; }

      if (String(u.ADDGames)      === 'False') _hide('nav-game');
      if (String(u.ADDContacts)   === 'False') _hide('nav-customer');
      if (String(u.Hisab)         === 'False') _hide('nav-hisab');
      if (String(u.HisabSummary)  === 'False') _hide('nav-hisab-summary');
      if (String(u.DateWiseHisab) === 'False') _hide('nav-date-wise');
      if (String(u.Balance)       === 'False') _hide('nav-balance');
      if (String(u.Accounts)      === 'False') _hide('nav-accounts');
      if (String(u.LC)            === 'False') _hide('nav-lc');
      if (String(u.Result)        === 'False') _hide('nav-results');
      if (String(u.Yantri)        === 'False') _hide('nav-yantri');

      // Staff cannot manage staff, access rights, or sub user balance/assignment
      _hide('nav-subusers');
      _hide('nav-access');
      _hide('nav-staff-balance');
      _hide('nav-assign-clients');
    } else if (u.SuperAdmin === 'SuperAdmin') {
      const adminItem = document.getElementById('nav-admin');
      if (adminItem) adminItem.style.display = 'block';
    }

    return u;
  } catch (e) {
    window.location.href = '/login.html';
    return null;
  }
}

// ── Helper: hide sidebar item by id ──
function _hide(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

// ── Admin shell (mirrors Susu9/ADMIN/MasterPage.master — same Atlantis theme,
// smaller sidebar menu: Dashboard/User/Sale/Yantri) ──
function renderAdminShell(active) {
  const item = (id, href, icon, label) => `
        <li class="nav-item ${active === id ? 'active' : ''}">
          <a href="${href}">
            <i class="${icon}" style="font-weight:bold;color:Black;"></i>
            <p style="font-weight:bold;color:Black;">${label}</p>
          </a>
        </li>`;

  return `
  <div class="main-header">
    <div class="logo-header" data-background-color="blue">
      <a href="/pages/admin/dashboard.html" class="logo" style="color:white;text-decoration:none;font-weight:700;letter-spacing:1px;">MahaMaya</a>
      <button class="navbar-toggler sidenav-toggler ml-auto" type="button" data-toggle="collapse" aria-expanded="false" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"><i class="icon-menu"></i></span>
      </button>
      <button class="more" onclick="location.href='/pages/home.html'"><i class="fas fa-home" style="color:white;"></i></button>
      <div class="nav-toggle"><button class="btn btn-toggle toggle-sidebar"><i class="icon-menu"></i></button></div>
    </div>
  </div>
  <div class="sidebar sidebar-style-2">
    <div class="sidebar-wrapper scrollbar scrollbar-inner">
      <div class="sidebar-content">
        <div class="user">
          <div class="info">
            <a data-toggle="collapse" href="#collapseUser" aria-expanded="true">
              <span>
                <span id="navUID" style="font-weight:bold;color:black;"></span>
                <span class="user-level" style="font-weight:bold;color:black;">Administrator</span>
                <span class="caret"></span>
              </span>
            </a>
            <div class="clearfix"></div>
            <div class="collapse in" id="collapseUser">
              <ul class="nav">
                <li><a href="#" onclick="doLogout();return false;"><span class="link-collapse" style="font-weight:bold;color:black;">Logout</span></a></li>
              </ul>
            </div>
          </div>
        </div>
        <ul class="nav nav-primary">
          <li class="mx-4 mt-2">
            <a href="/pages/admin/dashboard.html" class="btn btn-primary btn-block"><span class="btn-label mr-2"><i class="fa fa-home"></i></span>Dashboard</a>
          </li>
          <li class="nav-section">
            <span class="sidebar-mini-icon"><i class="fa fa-ellipsis-h"></i></span>
            <h4 class="text-section" style="font-weight:bold;color:Black;">Menu</h4>
          </li>
          ${item('dashboard', '/pages/admin/dashboard.html', 'fa fa-search', 'Dashboard')}
          ${item('users', '/pages/admin/users.html', 'fas fa-users', 'User')}
          ${item('user-sales', '/pages/admin/user-sales.html', 'fas fa-keyboard', 'Sale')}
          ${item('open-yantri', '/pages/admin/open-yantri.html', 'fas fa-chart-bar', 'Yantri')}
        </ul>
      </div>
    </div>
  </div>`;
}

function _wrapPageContent(shellHtml) {
  const existingContent = Array.from(document.body.childNodes);
  const mainPanel = document.createElement('div');
  mainPanel.className = 'main-panel';
  const contentWrap = document.createElement('div');
  contentWrap.className = 'content';
  existingContent.forEach(node => contentWrap.appendChild(node));
  mainPanel.appendChild(contentWrap);

  const wrapper = document.createElement('div');
  wrapper.className = 'wrapper';
  wrapper.innerHTML = shellHtml;
  wrapper.appendChild(mainPanel);

  document.body.innerHTML = '';
  document.body.appendChild(wrapper);
  _injectShellFixCss();
}

// ── initAdminPage — same asset loading as initPage, admin-only sidebar,
// requires SuperAdmin (matches ADMIN/*.aspx server-side access pattern) ──
async function initAdminPage(active) {
  _wrapPageContent(renderAdminShell(active));

  loadThemeFonts();
  await loadVendorAssets();
  _initMobileSidebarBackdrop();

  try {
    const r = await API.get('/api/auth/me');
    if (!r || !r.success) { window.location.href = '/login.html'; return null; }
    const u = r.user;
    if (u.SubUID || u.SuperAdmin !== 'SuperAdmin') { window.location.href = '/pages/home.html'; return null; }

    const navUID = document.getElementById('navUID');
    if (navUID) navUID.textContent = u.UID || '';

    return u;
  } catch (e) {
    window.location.href = '/login.html';
    return null;
  }
}

// ── Logout ──
async function doLogout() {
  try { await API.post('/api/auth/logout', {}); } catch (e) {}
  window.location.href = '/login.html';
}

// Global ESC handler — page hook, then modal, then history.back()
document.addEventListener('keyup', function (e) {
  if (e.key !== 'Escape') return;

  if (typeof window.__escPageHandler === 'function' && window.__escPageHandler()) return;

  const modal = document.querySelector('.modal-bg.show');
  if (modal) { modal.classList.remove('show'); return; }

  if (history.length > 1) history.back();
  else window.location.href = '/pages/home.html';
});

// Global Enter-to-advance fallback — many pages already wire their own
// per-field Enter behavior (e.g. jump to a specific next field); this only
// acts when a page hasn't already handled it (checked via
// event.defaultPrevented, which a page's own `return false` inline handler
// already sets, since inline attribute handlers run before this bubbling
// document listener does). Moves focus to the next visible field in the
// same card/modal, or clicks that section's primary button on the last field.
document.addEventListener('keydown', function (e) {
  if (e.key !== 'Enter' || e.defaultPrevented) return;
  const t = e.target;
  if (!t.matches || !t.matches(
    'input[type=text], input[type=tel], input[type=number], input[type=password], input[type=search], input[type=email], select'
  )) return;

  const container = t.closest('.card, .modal-box, .modal-content, .content') || document;
  const focusables = Array.from(container.querySelectorAll(
    'input[type=text], input[type=tel], input[type=number], input[type=password], input[type=search], input[type=email], select'
  )).filter(el => !el.disabled && !el.readOnly && el.offsetParent !== null);

  const idx = focusables.indexOf(t);
  if (idx === -1) return;

  if (idx < focusables.length - 1) {
    e.preventDefault();
    focusables[idx + 1].focus();
    if (focusables[idx + 1].select) focusables[idx + 1].select();
  } else {
    const btn = container.querySelector('.btn-success, .btn-primary, button[type=submit]');
    if (btn) { e.preventDefault(); btn.click(); }
  }
});
