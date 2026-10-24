import './loadEnv.js';
import { randomBytes, scryptSync, timingSafeEqual, randomInt } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const defaultPath = fileURLToPath(new URL('../data/viskora.sqlite', import.meta.url));
const dbPath = process.env.VISKORA_DB_PATH || defaultPath;
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const databaseUrl = process.env.DATABASE_URL
  || process.env.SUPABASE_DB_URL
  || process.env.POSTGRES_URL
  || process.env.POSTGRES_PRISMA_URL;
const remoteDatabase = Boolean(databaseUrl);
let db = null;
let postgresStorePromise = null;
if (!remoteDatabase && !process.env.VERCEL) {
  mkdirSync(dirname(dbPath), { recursive: true });
  db = new DatabaseSync(dbPath);
  db.exec(`
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK(role IN ('teacher','student')),
    password_hash TEXT NOT NULL, password_salt TEXT NOT NULL, created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS classes (
    id TEXT PRIMARY KEY, teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL, join_code TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS enrollments (
    class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TEXT NOT NULL, PRIMARY KEY(class_id, student_id)
  );
  CREATE TABLE IF NOT EXISTS reports (
    student_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    payload TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  `);
}

async function postgresStore() {
  if (!databaseUrl) {
    throw Object.assign(new Error('Set DATABASE_URL to your Supabase Postgres transaction-pooler connection string before using Viskora on Vercel.'), { statusCode: 503 });
  }
  postgresStorePromise ||= import('./postgresAccountStore.js');
  return postgresStorePromise;
}

const publicUser = ({ id, name, email, role }) => ({ id, name, email, role });
const getUserById = db?.prepare('SELECT id,name,email,role FROM users WHERE id = ?');
const getClassListForUser = db?.prepare(`
  SELECT c.id,c.name,c.join_code AS joinCode,c.teacher_id AS teacherId,u.name AS teacherName
  FROM classes c JOIN users u ON u.id=c.teacher_id
  WHERE c.teacher_id=? OR c.id IN (SELECT class_id FROM enrollments WHERE student_id=?)
  ORDER BY c.created_at DESC
`);

export async function register({ name, email, password, role }) {
  name = String(name || '').trim().slice(0, 80);
  email = String(email || '').trim().toLowerCase();
  if (name.length < 2) throw Object.assign(new Error('Enter your name (at least 2 characters).'), { statusCode: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Object.assign(new Error('Enter a valid email address.'), { statusCode: 400 });
  if (typeof password !== 'string' || password.length < 8 || password.length > 200) throw Object.assign(new Error('Password must be 8–200 characters.'), { statusCode: 400 });
  if (!['teacher', 'student'].includes(role)) throw Object.assign(new Error('Choose teacher or student.'), { statusCode: 400 });
  const id = randomBytes(16).toString('hex');
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  if (remoteDatabase || process.env.VERCEL) return (await postgresStore()).register({ id, name, email, role, passwordHash: hash, passwordSalt: salt });
  try {
    db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?,?)').run(id, name, email, role, hash, salt, new Date().toISOString());
  } catch (error) {
    if (error.errcode === 2067) throw Object.assign(new Error('An account with this email already exists.'), { statusCode: 409 });
    throw error;
  }
  return startSession(id);
}

export async function login({ email, password }) {
  if (remoteDatabase || process.env.VERCEL) {
    const store = await postgresStore();
    const user = await store.findUserForLogin(String(email || '').trim().toLowerCase());
    if (!user || typeof password !== 'string') throw Object.assign(new Error('Email or password is incorrect.'), { statusCode: 401 });
    const actual = scryptSync(password, user.passwordSalt, 64);
    if (!timingSafeEqual(actual, Buffer.from(user.passwordHash, 'hex'))) throw Object.assign(new Error('Email or password is incorrect.'), { statusCode: 401 });
    return store.createSession(user.id, randomBytes(32).toString('hex'));
  }
  const user = db.prepare('SELECT * FROM users WHERE email=?').get(String(email || '').trim().toLowerCase());
  if (!user || typeof password !== 'string') throw Object.assign(new Error('Email or password is incorrect.'), { statusCode: 401 });
  const actual = scryptSync(password, user.password_salt, 64);
  if (!timingSafeEqual(actual, Buffer.from(user.password_hash, 'hex'))) throw Object.assign(new Error('Email or password is incorrect.'), { statusCode: 401 });
  return startSession(user.id);
}

function startSession(userId) {
  const token = randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(token, userId, new Date().toISOString());
  return { token, user: publicUser(getUserById.get(userId)), classes: getClassListForUser.all(userId, userId) };
}

export async function authenticate(token) {
  if (!token) return null;
  if (remoteDatabase || process.env.VERCEL) return (await postgresStore()).authenticate(token);
  const row = db.prepare(`SELECT s.created_at AS createdAt,u.id,u.name,u.email,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=?`).get(token);
  if (row && (!Number.isFinite(Date.parse(row.createdAt)) || Date.now() - Date.parse(row.createdAt) > SESSION_MAX_AGE_MS)) {
    db.prepare('DELETE FROM sessions WHERE token=?').run(token);
    return null;
  }
  return row ? publicUser(row) : null;
}

export async function logout(token) {
  if (!token) return;
  if (remoteDatabase || process.env.VERCEL) return (await postgresStore()).logout(token);
  db.prepare('DELETE FROM sessions WHERE token=?').run(token);
}

export async function currentProfile(user) {
  if (remoteDatabase || process.env.VERCEL) return (await postgresStore()).currentProfile(user);
  return { user, classes: getClassListForUser.all(user.id, user.id) };
}

export async function createClass(user, { name }) {
  requireRole(user, 'teacher');
  name = String(name || '').trim().slice(0, 80);
  if (name.length < 2) throw Object.assign(new Error('Class name must be at least 2 characters.'), { statusCode: 400 });
  let code = randomInt(0, 36 ** 6).toString(36).toUpperCase().padStart(6, '0');
  const id = randomBytes(12).toString('hex');
  if (remoteDatabase || process.env.VERCEL) return (await postgresStore()).createClass(user, { id, name, joinCode: code });
  while (db.prepare('SELECT 1 FROM classes WHERE join_code=?').get(code)) code = randomInt(0, 36 ** 6).toString(36).toUpperCase().padStart(6, '0');
  db.prepare('INSERT INTO classes VALUES(?,?,?,?,?)').run(id, user.id, name, code, new Date().toISOString());
  return getClassListForUser.all(user.id, user.id).find(item => item.id === id);
}

export async function joinClass(user, { code }) {
  requireRole(user, 'student');
  code = String(code || '').trim().toUpperCase();
  if (remoteDatabase || process.env.VERCEL) {
    const item = await (await postgresStore()).joinClass(user, code);
    if (!item) throw Object.assign(new Error('No class matches that join code.'), { statusCode: 404 });
    return item;
  }
  const item = db.prepare(`SELECT c.id,c.name,c.join_code AS joinCode,c.teacher_id AS teacherId,u.name AS teacherName
    FROM classes c JOIN users u ON u.id=c.teacher_id WHERE c.join_code=?`).get(code);
  if (!item) throw Object.assign(new Error('No class matches that join code.'), { statusCode: 404 });
  db.prepare('INSERT OR IGNORE INTO enrollments VALUES(?,?,?)').run(item.id, user.id, new Date().toISOString());
  return item;
}

export async function saveReport(user, payload) {
  requireRole(user, 'student');
  const isPlainObject = value => value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
  if (!isPlainObject(payload) || !Array.isArray(payload.attempts)
    || payload.attempts.some(attempt => !isPlainObject(attempt))
    || payload.attempts.length > 1000
    || (payload.mastery !== null && payload.mastery !== undefined && !isPlainObject(payload.mastery))
    || (payload.prereqStatus !== null && payload.prereqStatus !== undefined && !isPlainObject(payload.prereqStatus))) {
    throw Object.assign(new Error('Invalid learning report.'), { statusCode: 400 });
  }
  const report = { attempts: payload.attempts, mastery: payload.mastery || {}, prereqStatus: payload.prereqStatus || {} };
  if (remoteDatabase || process.env.VERCEL) return (await postgresStore()).saveReport(user, report);
  db.prepare(`INSERT INTO reports VALUES(?,?,?) ON CONFLICT(student_id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at`)
    .run(user.id, JSON.stringify(report), new Date().toISOString());
  return { saved: true };
}

export async function ownReport(user) {
  requireRole(user, 'student');
  if (remoteDatabase || process.env.VERCEL) return (await postgresStore()).ownReport(user);
  const row = db.prepare('SELECT payload,updated_at AS updatedAt FROM reports WHERE student_id=?').get(user.id);
  return row ? { ...JSON.parse(row.payload), updatedAt: row.updatedAt } : { attempts: [], mastery: {}, prereqStatus: {} };
}

export async function classReports(user) {
  requireRole(user, 'teacher');
  if (remoteDatabase || process.env.VERCEL) return (await postgresStore()).classReports(user);
  const students = db.prepare(`
    SELECT u.id,u.name,u.email,c.id AS classId,c.name AS className,r.payload,r.updated_at AS updatedAt
    FROM classes c JOIN enrollments e ON e.class_id=c.id JOIN users u ON u.id=e.student_id
    LEFT JOIN reports r ON r.student_id=u.id WHERE c.teacher_id=? ORDER BY c.name,u.name
  `).all(user.id);
  const classes = getClassListForUser.all(user.id, user.id).map(item => ({ ...item, students: [] }));
  for (const row of students) {
    const report = row.payload ? JSON.parse(row.payload) : { attempts: [], mastery: {}, prereqStatus: {} };
    classes.find(item => item.id === row.classId)?.students.push({
      id: row.id, name: row.name, email: row.email, updatedAt: row.updatedAt,
      attempts: report.attempts || [], mastery: report.mastery || {},
    });
  }
  return { classes };
}

function requireRole(user, role) {
  if (!user) throw Object.assign(new Error('Sign in to continue.'), { statusCode: 401 });
  if (user.role !== role) throw Object.assign(new Error('You do not have access to this data.'), { statusCode: 403 });
}
