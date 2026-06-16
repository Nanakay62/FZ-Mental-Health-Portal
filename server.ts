import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import * as dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db, createPool } from './src/db/index.ts';
import { users, assessments } from './src/db/schema.ts';
import { eq, desc, sql } from 'drizzle-orm';

dotenv.config();

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'clinical_intake_system_secret_key_988';

async function bootstrap() {
  const app = express();
  app.use(express.json());

  // Ensure default administrative credentials exist in PostgreSQL table
  try {
    const pool = createPool();
    const client = await pool.connect();
    
    // Check if the admin email already exists
    const checkQuery = await client.query('SELECT * FROM users WHERE email = $1', ['admin@clinic.org']);
    if (checkQuery.rows.length === 0) {
      const hash = bcrypt.hashSync('admin', 10);
      await client.query(
        'INSERT INTO users (uid, email, display_name, role, password_hash) VALUES ($1, $2, $3, $4, $5)',
        ['admin-main-system', 'admin@clinic.org', 'Director Admin', 'admin', hash]
      );
      console.log('Successfully bootstrapped default administrative credentials: admin@clinic.org / admin');
    }
    client.release();
  } catch (error) {
    console.error('Database connection / bootstrap error during initialization:', error);
  }

  // Authentication Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Authorization token credentials expected.' });
    }

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) {
        return res.status(403).json({ message: 'Session session has expired.' });
      }
      req.user = user;
      next();
    });
  };

  // Auth Endpoint: CLINIC SECURITY LOGIN
  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Staff email and access password required.' });
    }

    try {
      const results = await db.select().from(users).where(eq(users.email, email));
      if (results.length === 0) {
        return res.status(401).json({ message: 'Staff credential profiles not found for email provided.' });
      }

      const user = results[0];
      if (!user.passwordHash) {
        return res.status(401).json({ message: 'User password hash is not initialized.' });
      }

      const isValidPassword = bcrypt.compareSync(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Staff credentials mismatch or token invalid.' });
      }

      // Generate Jwt Token
      const token = jwt.sign(
        { id: user.id, uid: user.uid, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '8h' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          role: user.role
        }
      });
    } catch (err: any) {
      console.error('Auth login service error:', err);
      res.status(500).json({ message: 'Database login query failure.', error: err.message });
    }
  });

  // Intake Endpoint: Patient assessment submission
  app.post('/api/assessments', async (req, res) => {
    const { 
      patientName, patientEmail, phqAnswers, gadAnswers, 
      phqScore, gadScore, phqSeverity, gadSeverity, hasQ9Alert 
    } = req.body;

    if (!patientName || !patientEmail || !phqAnswers || !gadAnswers) {
      return res.status(400).json({ message: 'Incomplete client-side questionnaire payload.' });
    }

    try {
      const newAssessment = await db.insert(assessments).values({
        patientName,
        patientEmail,
        phqAnswers,
        gadAnswers,
        phqScore: Number(phqScore),
        gadScore: Number(gadScore),
        phqSeverity,
        gadSeverity,
        hasQ9Alert: Boolean(hasQ9Alert),
        clinicianNotes: ''
      }).returning();

      res.status(201).json(newAssessment[0]);
    } catch (err: any) {
      console.error('Assessment submission write error:', err);
      res.status(500).json({ message: 'System intake logging error.', error: err.message });
    }
  });

  // Admin Intake Diagnostics Screen: GET ALL submissions + aggregate stats
  app.get('/api/assessments', authenticateToken, async (req, res) => {
    try {
      const records = await db.select().from(assessments).orderBy(desc(assessments.createdAt));

      // Calculate stats
      const totalSubmissions = records.length;
      let totalPhq = 0;
      let totalGad = 0;
      let highRiskCount = 0;

      records.forEach(r => {
        totalPhq += r.phqScore;
        totalGad += r.gadScore;
        if (r.hasQ9Alert || r.phqScore >= 15 || r.gadScore >= 15) {
          highRiskCount++;
        }
      });

      const avgPhq9 = totalSubmissions > 0 ? totalPhq / totalSubmissions : 0;
      const avgGad7 = totalSubmissions > 0 ? totalGad / totalSubmissions : 0;

      res.json({
        assessments: records,
        stats: {
          totalSubmissions,
          avgPhq9,
          avgGad7,
          highRiskFlags: highRiskCount
        }
      });
    } catch (err: any) {
      console.error('Get assessments clinical query failure:', err);
      res.status(500).json({ message: 'Db error retrieving clinical assessments.', error: err.message });
    }
  });

  // Review Put: Update clinician notes and review status
  app.put('/api/assessments/:id/notes', authenticateToken, async (req, res) => {
    const id = Number(req.params.id);
    const { clinicianNotes } = req.body;

    if (isNaN(id) || clinicianNotes === undefined) {
      return res.status(400).json({ message: 'Invalid assessment ID or clinical comment fields.' });
    }

    try {
      // Get the clinician user entry to tag review logs
      const clinicianUid = (req as any).user.uid;
      const clinicianMatches = await db.select().from(users).where(eq(users.uid, clinicianUid));
      const clinicianId = clinicianMatches.length > 0 ? clinicianMatches[0].id : null;

      const updated = await db.update(assessments)
        .set({
          clinicianNotes,
          reviewedBy: clinicianId,
          reviewedAt: new Date()
        })
        .where(eq(assessments.id, id))
        .returning();

      if (updated.length === 0) {
        return res.status(404).json({ message: 'Case assessment targets not found.' });
      }

      res.json(updated[0]);
    } catch (err: any) {
      console.error('Update clinician note query error:', err);
      res.status(500).json({ message: 'Db evaluation note update error.', error: err.message });
    }
  });

  // Delete Endpoint: DELETE patient assessment key
  app.delete('/api/assessments/:id', authenticateToken, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid assessment ID.' });
    }

    try {
      const deleted = await db.delete(assessments)
        .where(eq(assessments.id, id))
        .returning();

      if (deleted.length === 0) {
        return res.status(404).json({ message: 'Case assessment not found.' });
      }

      res.json({ message: 'Case assessment successfully deleted.', deleted: deleted[0] });
    } catch (err: any) {
      console.error('Delete assessment error:', err);
      res.status(500).json({ message: 'Database delete query failure.', error: err.message });
    }
  });

  // Vite Integration setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Bind to container port
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Clinic core port listening on http://localhost:${PORT}`);
  });
}

bootstrap();
