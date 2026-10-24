import React, { useState } from 'react';
import { accountRequest, setSession } from '../data/accountApi.js';
import './AccountGate.css';

export default function AccountGate({ onSignedIn }) {
  const [mode, setMode] = useState('login');
  const [role, setRole] = useState('student');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      const result = await accountRequest(`/api/auth/${mode === 'signup' ? 'register' : 'login'}`, { method: 'POST', body: { ...form, role } });
      setSession(result); onSignedIn(result);
    } catch (issue) { setError(issue.message); } finally { setBusy(false); }
  }

  return <main className="account-gate">
    <div className="account-card">
      <div className="account-mark">V</div>
      <p className="account-eyebrow">Viskora learning space</p>
      <h1>{mode === 'signup' ? 'Create your profile' : 'Welcome back'}</h1>
      <p className="account-intro">{mode === 'signup' ? 'Set up a teacher or student profile to keep learning reports connected.' : 'Sign in to continue to your tutor and learning reports.'}</p>
      <form onSubmit={submit}>
        {mode === 'signup' && <label>Your name<input required minLength="2" maxLength="80" autoComplete="name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>}
        <label>Email<input required type="email" autoComplete="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
        <label>Password<input required type="password" minLength="8" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></label>
        {mode === 'signup' && <label>Profile type<select value={role} onChange={e => setRole(e.target.value)}><option value="student">Student</option><option value="teacher">Teacher</option></select></label>}
        {error && <p className="account-error" role="alert">{error}</p>}
        <button className="account-submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create profile' : 'Sign in'}</button>
      </form>
      <p className="account-switch">{mode === 'signup' ? 'Already have a profile?' : 'New to Viskora?'} <button onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError(''); }}>{mode === 'signup' ? 'Sign in' : 'Create a profile'}</button></p>
    </div>
  </main>;
}
