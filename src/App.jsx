/* ── App root ────────────────────────────────────────────── */
import React from 'react';
import { AppProvider, useApp } from './store/AppContext.jsx';
import Sidebar from './components/Sidebar.jsx';
import TutorView from './components/TutorView.jsx';
import ChatPanel from './components/ChatPanel.jsx';
import ProgressPage from './components/ProgressPage.jsx';
import './styles/App.css';

function Shell() {
  const { state } = useApp();

  if (state.currentView === 'progress') {
    return (
      <div className="app-shell">
        <Sidebar />
        <ProgressPage />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <TutorView />
      <ChatPanel />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
