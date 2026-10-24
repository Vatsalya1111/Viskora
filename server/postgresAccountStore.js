import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);
let schemaPromise;

async function ensureSchema() {
  if (!schemaPromise) schemaPromise = (async () => {
    await sql`CREATE TABLE IF NOT EXISTS users (
      id text PRIMARY KEY, name text NOT NULL, email text NOT NULL UNIQUE,
      role text NOT NULL CHECK (role IN ('teacher','student')),
      password_hash text NOT NULL, password_salt text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS sessions (
      token text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS classes (
      id text PRIMARY KEY, teacher_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name text NOT NULL, join_code text NOT NULL UNIQUE, created_at timestamptz NOT NULL DEFAULT now()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS enrollments (
      class_id text NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      student_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      joined_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (class_id, student_id)
    )`;
    await sql`CREATE TABLE IF NOT EXISTS reports (
      student_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      payload jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
    )`;
  })();
  return schemaPromise;
}

async function classesFor(userId) {
  await ensureSchema();
  return sql`SELECT c.id,c.name,c.join_code AS "joinCode",c.teacher_id AS "teacherId",u.name AS "teacherName"
    FROM classes c JOIN users u ON u.id=c.teacher_id
    WHERE c.teacher_id=${userId} OR c.id IN (SELECT class_id FROM enrollments WHERE student_id=${userId})
    ORDER BY c.created_at DESC`;
}

export async function register({ id, name, email, role, passwordHash, passwordSalt }) {
  await ensureSchema();
  try {
    await sql`INSERT INTO users (id,name,email,role,password_hash,password_salt) VALUES (${id},${name},${email},${role},${passwordHash},${passwordSalt})`;
  } catch (error) {
    if (error.code === '23505') throw Object.assign(new Error('An account with this email already exists.'), { statusCode: 409 });
    throw error;
  }
  return createSession(id);
}

export async function findUserForLogin(email) {
  await ensureSchema();
  const [user] = await sql`SELECT id,name,email,role,password_hash AS "passwordHash",password_salt AS "passwordSalt" FROM users WHERE email=${email}`;
  return user;
}

export async function createSession(userId, token) {
  await ensureSchema();
  token ||= (await import('node:crypto')).randomBytes(32).toString('hex');
  await sql`INSERT INTO sessions (token,user_id) VALUES (${token},${userId})`;
  const [user] = await sql`SELECT id,name,email,role FROM users WHERE id=${userId}`;
  return { token, user, classes: await classesFor(userId) };
}

export async function authenticate(token) {
  await ensureSchema();
  const [user] = await sql`SELECT u.id,u.name,u.email,u.role FROM sessions s JOIN users u ON u.id=s.user_id
    WHERE s.token=${token} AND s.created_at > now() - interval '30 days'`;
  if (!user) await sql`DELETE FROM sessions WHERE token=${token}`;
  return user || null;
}

export async function logout(token) { await ensureSchema(); await sql`DELETE FROM sessions WHERE token=${token}`; }
export async function currentProfile(user) { return { user, classes: await classesFor(user.id) }; }

export async function createClass(user, { id, name, joinCode }) {
  await ensureSchema();
  await sql`INSERT INTO classes (id,teacher_id,name,join_code) VALUES (${id},${user.id},${name},${joinCode})`;
  return (await classesFor(user.id)).find(item => item.id === id);
}

export async function joinClass(user, code) {
  await ensureSchema();
  const [item] = await sql`SELECT c.id,c.name,c.join_code AS "joinCode",c.teacher_id AS "teacherId",u.name AS "teacherName"
    FROM classes c JOIN users u ON u.id=c.teacher_id WHERE c.join_code=${code}`;
  if (!item) return null;
  await sql`INSERT INTO enrollments (class_id,student_id) VALUES (${item.id},${user.id}) ON CONFLICT DO NOTHING`;
  return item;
}

export async function saveReport(user, payload) {
  await ensureSchema();
  await sql`INSERT INTO reports (student_id,payload) VALUES (${user.id},${JSON.stringify(payload)}::jsonb)
    ON CONFLICT (student_id) DO UPDATE SET payload=excluded.payload,updated_at=now()`;
  return { saved: true };
}

export async function ownReport(user) {
  await ensureSchema();
  const [row] = await sql`SELECT payload,updated_at AS "updatedAt" FROM reports WHERE student_id=${user.id}`;
  return row ? { ...row.payload, updatedAt: row.updatedAt } : { attempts: [], mastery: {}, prereqStatus: {} };
}

export async function classReports(user) {
  await ensureSchema();
  const [classes, students] = await Promise.all([
    classesFor(user.id),
    sql`SELECT u.id,u.name,u.email,c.id AS "classId",r.payload,r.updated_at AS "updatedAt"
      FROM classes c JOIN enrollments e ON e.class_id=c.id JOIN users u ON u.id=e.student_id
      LEFT JOIN reports r ON r.student_id=u.id WHERE c.teacher_id=${user.id} ORDER BY c.name,u.name`,
  ]);
  const result = classes.map(item => ({ ...item, students: [] }));
  for (const row of students) {
    const report = row.payload || { attempts: [], mastery: {}, prereqStatus: {} };
    result.find(item => item.id === row.classId)?.students.push({
      id: row.id, name: row.name, email: row.email, updatedAt: row.updatedAt,
      attempts: report.attempts || [], mastery: report.mastery || {},
    });
  }
  return { classes: result };
}
