/* ── App root ────────────────────────────────────────────── */
import React from 'react';
import { AppProvider, useApp } from './store/AppContext.jsx';
import Sidebar from './components/Sidebar.jsx';
import TutorView from './components/TutorView.jsx';
import ChatPanel from './components/ChatPanel.jsx';
import ProgressPage from './components/ProgressPage.jsx';
import AccountGate from './components/AccountGate.jsx';
import TeacherDashboard from './components/TeacherDashboard.jsx';
import { clearSession, getSession, accountRequest } from './data/accountApi.js';
import './styles/App.css';

function Shell({ session, onSignOut, onSessionChange }) {
  const { state, dispatch } = useApp();
  const [mobilePanel, setMobilePanel] = React.useState('study');
  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <div className={`app-shell${mobilePanel === 'chat' ? ' mobile-chat-active' : ''}`}>
      <header className="mobile-toolbar">
        <button className="mobile-menu-button" onClick={() => setMenuOpen(true)} aria-label="Open navigation menu">☰</button>
        <div className="mobile-view-switch" role="tablist" aria-label="Learning views">
          <button role="tab" aria-selected={mobilePanel === 'study'} className={mobilePanel === 'study' ? 'active' : ''} onClick={() => setMobilePanel('study')}>Work</button>
          <button role="tab" aria-selected={mobilePanel === 'chat'} className={mobilePanel === 'chat' ? 'active' : ''} onClick={() => { dispatch({ type: 'SET_VIEW', payload: 'tutor' }); setMobilePanel('chat'); }}>Tutor</button>
        </div>
      </header>
      {menuOpen && <button className="mobile-menu-scrim" aria-label="Close navigation menu" onClick={() => setMenuOpen(false)} />}
      <Sidebar session={session} onSignOut={onSignOut} onSessionChange={onSessionChange} mobileOpen={menuOpen} onMobileClose={() => setMenuOpen(false)} />
      {state.currentView === 'progress' ? <ProgressPage /> : <TutorView />}
      <ChatPanel mobileActive={mobilePanel === 'chat'} onMobileMinimize={() => setMobilePanel('study')} />
    </div>
  );
}

export default function App() {
  const [session, setSession] = React.useState(getSession);
  const [checking, setChecking] = React.useState(Boolean(getSession()));

  React.useEffect(() => {
    if (!session?.token) { setChecking(false); return; }
    let active = true;
    accountRequest('/api/me').then(profile => {
      if (active) setSession(current => ({ ...current, ...profile }));
    }).catch(error => { if (active && error.status === 401) { clearSession(); setSession(null); } })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, []);

  async function signOut() {
    try { await accountRequest('/api/auth/logout', { method: 'POST', body: {} }); } catch { /* local sign-out still applies */ }
    clearSession(); setSession(null);
  }

  if (checking) return <div className="account-loading">Loading your profile…</div>;
  if (!session?.token) return <AccountGate onSignedIn={setSession} />;
  if (session.user?.role === 'teacher') return <TeacherDashboard session={session} onSignOut={signOut} />;
  return (
    <AppProvider userId={session.user.id}>
      <Shell session={session} onSignOut={signOut} onSessionChange={setSession} />
    </AppProvider>
  );
}
