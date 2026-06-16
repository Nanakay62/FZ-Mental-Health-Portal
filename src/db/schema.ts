import { pgTable, serial, text, integer, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Admin / Clinician Users linked with Firebase Authentication UID
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID or system username
  email: text('email').notNull().unique(),
  displayName: text('display_name'),
  role: text('role').default('admin').notNull(), // 'admin' | 'clinician' etc.
  passwordHash: text('password_hash'), // secure bcrypt hash
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Patient Mental Health Assessments
export const assessments = pgTable('assessments', {
  id: serial('id').primaryKey(),
  patientName: text('patient_name').notNull(),
  patientEmail: text('patient_email').notNull(),
  
  // Array of answers [0-3] for standard questions
  phqAnswers: jsonb('phq_answers').$type<number[]>().notNull(), // 9 elements
  gadAnswers: jsonb('gad_answers').$type<number[]>().notNull(), // 7 elements
  
  // Calculated diagnostic metrics
  phqScore: integer('phq_score').notNull(),
  gadScore: integer('gad_score').notNull(),
  phqSeverity: text('phq_severity').notNull(), // Minimal | Mild | Moderate | Moderately Severe | Severe
  gadSeverity: text('gad_severity').notNull(), // Minimal | Mild | Moderate | Severe
  hasQ9Alert: boolean('has_q9_alert').default(false).notNull(), // True if PHQ Question 9 > 0
  
  // Clinic / Case Notes edited by clinicians in the admin dashboard
  clinicianNotes: text('clinician_notes').default('').notNull(),
  reviewedBy: integer('reviewed_by').references(() => users.id),
  reviewedAt: timestamp('reviewed_at'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Define Relationships
export const usersRelations = relations(users, ({ many }) => ({
  reviewedAssessments: many(assessments),
}));

export const assessmentsRelations = relations(assessments, ({ one }) => ({
  reviewer: one(users, {
    fields: [assessments.reviewedBy],
    references: [users.id],
  }),
}));
