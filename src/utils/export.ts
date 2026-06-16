import { jsPDF } from 'jspdf';
import { Assessment } from '../types.ts';
import { PHQ9_QUESTIONS, GAD7_QUESTIONS, SCORING_OPTIONS } from './scoring.ts';

// Client-side PDF generation using jsPDF
export function exportToPDF(assessment: Assessment) {
  const doc = new jsPDF();
  
  // Color palette
  const darkGray = '#1e293b';
  const blue = '#2563eb';
  const gray = '#64748b';
  const lightGray = '#f1f5f9';
  const red = '#dc2626';

  // Title / Clinic Header
  doc.setFillColor(30, 41, 59); // bg-slate-800
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('CLINICAL INTAKE DISPOSITION', 15, 18);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184);
  doc.text(`System ID: #${assessment.id}  |  Generated: ${new Date().toLocaleDateString()}`, 15, 28);

  // Patient Info section
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('PATIENT DEMOGRAPHIC METADATA', 15, 52);
  
  doc.setDrawColor(226, 232, 240);
  doc.line(15, 55, 195, 55);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(`Full Name:`, 15, 62);
  doc.setFont('helvetica', 'bold');
  doc.text(assessment.patientName, 45, 62);
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Email Address:`, 15, 68);
  doc.setFont('helvetica', 'bold');
  doc.text(assessment.patientEmail, 45, 68);
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Intake Date:`, 15, 74);
  doc.setFont('helvetica', 'bold');
  doc.text(new Date(assessment.createdAt).toLocaleString(), 45, 74);

  // Diagnostic Scoring & Severity
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('DIAGNOSTIC SCREENING METRICS', 15, 88);
  doc.line(15, 91, 195, 91);

  // PHQ-9 Card (Box)
  doc.setFillColor(248, 250, 252);
  doc.rect(15, 96, 85, 30, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(15, 96, 85, 30, 'S');
  
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('PHQ-9 DEPRESSION INDEX', 20, 102);
  
  doc.setFontSize(22);
  doc.setTextColor(37, 99, 235);
  doc.text(String(assessment.phqScore), 20, 114);
  
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text(`Severity: ${assessment.phqSeverity}`, 20, 122);

  // GAD-7 Card (Box)
  doc.setFillColor(248, 250, 252);
  doc.rect(110, 96, 85, 30, 'F');
  doc.rect(110, 96, 85, 30, 'S');
  
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(9);
  doc.text('GAD-7 ANXIETY INDEX', 115, 102);
  
  doc.setFontSize(22);
  doc.setTextColor(37, 99, 235);
  doc.text(String(assessment.gadScore), 115, 114);
  
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text(`Severity: ${assessment.gadSeverity}`, 115, 122);

  // Suicide ideation warning (Flag Alert)
  let nextY = 138;
  if (assessment.hasQ9Alert) {
    doc.setFillColor(254, 242, 242);
    doc.rect(15, 132, 180, 12, 'F');
    doc.setDrawColor(252, 165, 165);
    doc.rect(15, 132, 180, 12, 'S');
    
    doc.setTextColor(220, 38, 38);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('CRITICAL ALERT: HIGH PRIVILEGE SAFETY INDICATOR (PHQ Q9 > 0)', 20, 140);
    nextY = 152;
  }

  // Clinical Clinician Note Form Field
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('CLINICAL EVALUATION & CASE NOTES', 15, nextY);
  doc.line(15, nextY + 3, 195, nextY + 3);

  // Case note box
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(255, 255, 255);
  doc.rect(15, nextY + 8, 180, 40, 'FD');
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  
  const notesText = assessment.clinicianNotes || '(No case notes recorded. Clinician may append comments in active evaluation below)';
  const lines = doc.splitTextToSize(notesText, 172);
  doc.text(lines, 20, nextY + 14);

  // Signed lines
  const signY = nextY + 58;
  doc.line(15, signY + 12, 90, signY + 12);
  doc.text('Authorized Clinician Signature', 15, signY + 17);
  
  doc.line(120, signY + 12, 195, signY + 12);
  doc.text('Credential Level & Date', 120, signY + 17);

  // Save/Download PDF
  const filename = `Clinical_Assessment_${assessment.patientName.replace(/\s+/g, '_')}_ID${assessment.id}.pdf`;
  doc.save(filename);
}

// Client-side Microsoft Word Layout download using custom structured HTML parser Blob
export function exportToWord(assessment: Assessment) {
  const content = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <title>Clinical Assessment Intake Report</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; line-height: 1.5; }
        h1 { font-size: 20pt; color: #1e293b; border-bottom: 2px solid #2563eb; padding-bottom: 8px; margin-bottom: 20px; }
        h2 { font-size: 13pt; color: #1e293b; margin-top: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
        .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .meta-table td { padding: 6px 12px; border: 1px solid #e2e8f0; font-size: 10pt; }
        .meta-label { font-weight: bold; background-color: #f8fafc; color: #475569; width: 30%; }
        .alert-box { background-color: #fef2f2; border: 1px solid #fca5a5; padding: 12px; color: #dc2626; font-weight: bold; font-size: 10pt; margin: 15px 0; }
        .score-container { width: 100%; border-collapse: collapse; margin-top: 15px; }
        .score-card { border: 1px solid #e2e8f0; background-color: #f8fafc; padding: 12px; text-align: center; }
        .score-value { font-size: 24pt; font-weight: bold; color: #2563eb; margin: 5px 0; }
        .notes-area { border: 1px solid #cbd5e1; min-height: 150px; padding: 15px; font-size: 10pt; background-color: #ffffff; margin-top: 10px; }
      </style>
    </head>
    <body>
      <h1>CLINICAL ASSESSMENT DISPOSITION REPORT</h1>
      
      <h2>PATIENT INTAKE METADATA</h2>
      <table class="meta-table">
        <tr>
          <td class="meta-label">Patient Full Name</td>
          <td>${assessment.patientName}</td>
        </tr>
        <tr>
          <td class="meta-label">Reference ID</td>
          <td>#${assessment.id}</td>
        </tr>
        <tr>
          <td class="meta-label">Email Address</td>
          <td>${assessment.patientEmail}</td>
        </tr>
        <tr>
          <td class="meta-label">Intake Screen Date</td>
          <td>${new Date(assessment.createdAt).toLocaleString()}</td>
        </tr>
      </table>

      ${assessment.hasQ9Alert ? `
      <div class="alert-box">
        ⚠️ CRITICAL CLINICAL ALERT: Patient reported suicidal ideation thoughts (Score for PHQ-9 Question 9 is positive).
      </div>
      ` : ''}

      <h2>DIAGNOSTIC SCREENING PERFORMANCE</h2>
      <table style="width:100%; border-spacing: 12px; border-collapse: separate;">
        <tr>
          <td class="score-card" style="width: 50%;">
            <div style="font-weight: bold; font-size: 9pt; color: #475569;">PHQ-9 DEPRESSION METRIC</div>
            <div class="score-value">${assessment.phqScore}</div>
            <div style="font-size: 10pt; font-weight: bold; color: #1e293b;">Severity: ${assessment.phqSeverity}</div>
          </td>
          <td class="score-card" style="width: 50%;">
            <div style="font-weight: bold; font-size: 9pt; color: #475569;">GAD-7 ANXIETY METRIC</div>
            <div class="score-value">${assessment.gadScore}</div>
            <div style="font-size: 10pt; font-weight: bold; color: #1e293b;">Severity: ${assessment.gadSeverity}</div>
          </td>
        </tr>
      </table>

      <h2>CLINICAL INTERVENTION CASE NOTES</h2>
      <div class="notes-area">
        ${assessment.clinicianNotes ? assessment.clinicianNotes.replace(/\n/g, '<br/>') : '<i>[Case notes text box left blank here for secondary clinician input]</i>'}
      </div>

      <br/><br/>
      <table style="width:100%; margin-top: 40px; border-collapse: collapse;">
        <tr>
          <td style="width: 50%; border-top: 1px solid #1e293b; padding-top: 8px; font-size: 9pt;">
            Authorized Clinician Signature
          </td>
          <td style="width: 10%;">&nbsp;</td>
          <td style="width: 40%; border-top: 1px solid #1e293b; padding-top: 8px; font-size: 9pt;">
            Clinical Review Date
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff' + content], {
    type: 'application/msword'
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Clinical_Report_${assessment.patientName.replace(/\s+/g, '_')}_ID${assessment.id}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
