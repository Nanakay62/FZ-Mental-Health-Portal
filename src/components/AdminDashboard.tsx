import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, ClipboardList, ShieldCheck, LogOut, Search, AlertOctagon, 
  ChevronRight, Calendar, Mail, User, Save, FileText, Download, CheckCircle, RefreshCw, Trash2
} from 'lucide-react';
import { Assessment, DashboardStats, User as UserType } from '../types.ts';
import { getAuthHeaders, clearAuth } from '../utils/auth.ts';
import { getPhqSeverityColor, getGadSeverityColor, PHQ9_QUESTIONS, GAD7_QUESTIONS, SCORING_OPTIONS } from '../utils/scoring.ts';
import { exportToPDF, exportToWord } from '../utils/export.ts';

interface AdminDashboardProps {
  user: UserType;
  onLogout: () => void;
}

export default function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalSubmissions: 0,
    avgPhq9: 0,
    avgGad7: 0,
    highRiskFlags: 0
  });

  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all'); // all, high-risk, normal
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  
  // Note editing state
  const [clinicianNotes, setClinicianNotes] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDeleteAssessment = async (assessmentId: number) => {
    try {
      const res = await fetch(`/api/assessments/${assessmentId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.status === 401 || res.status === 403) {
        onLogout();
        return;
      }
      if (!res.ok) throw new Error('Failed to delete assessment.');
      
      setAssessments(prev => prev.filter(a => a.id !== assessmentId));
      if (selectedAssessment && selectedAssessment.id === assessmentId) {
        setSelectedAssessment(null);
      }
      setDeletingId(null);
      fetchAssessments();
    } catch (err) {
      console.error(err);
    }
  };

  // Trigger loading of assessments
  const fetchAssessments = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/assessments', {
        headers: getAuthHeaders(),
      });
      if (res.status === 401 || res.status === 403) {
        onLogout(); // Token expired or invalid
        return;
      }
      if (!res.ok) throw new Error('Failed to load assessments.');
      
      const data = await res.json();
      setAssessments(data.assessments || []);
      setStats(data.stats || {
        totalSubmissions: 0,
        avgPhq9: 0,
        avgGad7: 0,
        highRiskFlags: 0
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessments();
  }, []);

  const handleUpdateNotes = async (assessmentId: number) => {
    setSaveStatus('saving');
    try {
      const res = await fetch(`/api/assessments/${assessmentId}/notes`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ clinicianNotes }),
      });

      if (!res.ok) throw new Error('Failed to update notes.');
      
      // Update local state
      setAssessments(prev => prev.map(a => a.id === assessmentId ? { ...a, clinicianNotes } : a));
      if (selectedAssessment && selectedAssessment.id === assessmentId) {
        setSelectedAssessment({ ...selectedAssessment, clinicianNotes });
      }
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
    }
  };

  const handleActionedAlert = async (assessmentId: number) => {
    try {
      // For clinical safety, a notes-appended flag signifies resolving the immediate threat.
      // We'll append a timestamped audit trail line in notes.
      const resolvedNote = `\n[AUDIT ALERT: Actioned and marked safe by clinician ${user.email} on ${new Date().toLocaleString()}]\n`;
      const currentNotes = assessments.find(a => a.id === assessmentId)?.clinicianNotes || '';
      const updatedNotes = currentNotes + resolvedNote;

      const res = await fetch(`/api/assessments/${assessmentId}/notes`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ clinicianNotes: updatedNotes }),
      });

      if (res.ok) {
        setAssessments(prev => prev.map(a => a.id === assessmentId ? { ...a, clinicianNotes: updatedNotes, hasQ9Alert: false } : a));
        if (selectedAssessment && selectedAssessment.id === assessmentId) {
          setSelectedAssessment(prev => prev ? { ...prev, clinicianNotes: updatedNotes, hasQ9Alert: false } : null);
        }
        fetchAssessments();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Searching & Filtering
  const filteredAssessments = assessments.filter(a => {
    const term = searchTerm.toLowerCase();
    const idStr = `#${a.id}`;
    const matchesSearch = 
      a.patientName.toLowerCase().includes(term) ||
      a.patientEmail.toLowerCase().includes(term) ||
      idStr.includes(term);

    if (!matchesSearch) return false;

    if (filterSeverity === 'high-risk') {
      return a.hasQ9Alert || a.phqScore >= 15 || a.gadScore >= 15;
    }
    if (filterSeverity === 'normal') {
      return !a.hasQ9Alert && a.phqScore < 15 && a.gadScore < 15;
    }
    return true;
  });

  const firstHighRiskAlert = assessments.find(a => a.hasQ9Alert);

  return (
    <div className="flex w-full h-[768px] bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Clinician Left Sidebar */}
      <aside className="w-64 bg-slate-900 flex flex-col flex-shrink-0">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3 text-white font-bold tracking-tight">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span>FZ HEALTH</span>
          </div>
        </div>

        <nav className="flex-1 py-4 space-y-1">
          <div className="px-6 mb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Main Console</div>
          <button 
            onClick={() => { setSelectedAssessment(null); }}
            className="w-full flex items-center gap-3 px-6 py-2.5 bg-slate-800 text-white border-r-4 border-blue-500 text-xs font-semibold cursor-pointer text-left"
          >
            <ClipboardList className="w-4 h-4 text-blue-400" />
            <span>Diagnostics Feed</span>
          </button>
          
          <div className="px-6 mt-6 mb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Active Staff</div>
          <div className="px-6 py-2">
            <p className="text-xs text-white font-semibold truncate">{user.displayName || user.email}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono mt-0.5">Role: {user.role}</p>
          </div>
        </nav>

        {/* Console Footers */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs text-red-400 hover:text-red-300 rounded font-semibold transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Terminate Session</span>
          </button>
          <div className="text-slate-500 text-[10px] font-mono leading-relaxed">
            PROD_ENV v2.4.1<br />
            DB CON: ACTIVE
          </div>
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between flex-shrink-0">
          <div className="flex flex-col">
            <h1 className="text-base font-bold text-slate-800">FZ Safety and Health - Assessment Monitor</h1>
            <p className="text-[10px] text-slate-500 flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
              <span>Live Diagnostic Stream &bull; 312 Concurrent Sessions</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchAssessments}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
              title="Refresh Screen Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <div className="w-8 h-8 bg-slate-200 rounded-full border border-slate-300 flex items-center justify-center font-bold text-slate-600 text-xs">
              {(user.displayName || 'DR').substring(0, 2).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Suicide ideation indicator alert */}
        {firstHighRiskAlert && (
          <div className="bg-red-50 border-b border-red-100 px-8 py-3 flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center text-white">
                <AlertOctagon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-red-800">CRITICAL SAFETY ALERT</p>
                <p className="text-[11px] text-red-700">
                  Patient <strong>{firstHighRiskAlert.patientName}</strong> (ID #{firstHighRiskAlert.id}) reported positive suicidal ideation (PHQ-9 Q9 &gt; 0). Immediate outreach requested.
                </p>
              </div>
            </div>
            <button 
              onClick={() => handleActionedAlert(firstHighRiskAlert.id)}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold rounded uppercase tracking-wider transition-colors cursor-pointer"
            >
              Actioned
            </button>
          </div>
        )}

        {/* Dashboard Dashboard statistics */}
        <div className="p-6 flex-1 flex flex-col gap-5 overflow-hidden">
          {/* Bento grids stats rows */}
          <div className="grid grid-cols-4 gap-4 flex-shrink-0">
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Total Submissions</div>
              <div className="text-2xl font-bold font-mono tracking-tight text-slate-800">{stats.totalSubmissions}</div>
              <div className="text-[10px] text-green-600 font-semibold mt-1">Direct Clinical Ingestion</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Avg PHQ-9 Score</div>
              <div className="text-2xl font-bold font-mono tracking-tight text-slate-800">{stats.avgPhq9.toFixed(1)}</div>
              <div className="text-[10px] text-amber-600 font-semibold mt-1">Moderate Severity Benchmark</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Avg GAD-7 Score</div>
              <div className="text-2xl font-bold font-mono tracking-tight text-slate-800">{stats.avgGad7.toFixed(1)}</div>
              <div className="text-[10px] text-blue-600 font-semibold mt-1">Anxiety Symptoms Average</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">High Risk Flags</div>
              <div className="text-2xl font-bold text-red-600 font-mono tracking-tight">{stats.highRiskFlags}</div>
              <div className="text-[10px] text-red-500 font-semibold mt-1 uppercase">Immediate Review Triggered</div>
            </div>
          </div>

          <div className="flex-1 flex gap-5 overflow-hidden">
            {/* Table layout (Left side) */}
            <div className={`bg-white border border-slate-200 rounded-lg flex flex-col overflow-hidden transition-all duration-300 ${selectedAssessment ? 'w-3/5' : 'w-full'}`}>
              {/* Filter controls */}
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-2.5 text-slate-400">
                    <Search className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search Patient Name, Email, ID..."
                    className="w-full bg-white border border-slate-200 rounded-md pl-9 pr-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Filters:</span>
                  <select
                    value={filterSeverity}
                    onChange={(e) => setFilterSeverity(e.target.value)}
                    className="bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs font-semibold outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="all">Show All Assessments</option>
                    <option value="high-risk">High Risk / Alert Only</option>
                    <option value="normal">Normal / Standard Only</option>
                  </select>
                </div>
              </div>

              {/* Table Column headers (6 cols) */}
              <div className="grid grid-cols-6 text-[10px] font-bold uppercase text-slate-400 bg-slate-50 px-4 py-2.5 border-b border-slate-200 tracking-wider flex-shrink-0">
                <div className="col-span-2">Patient Contact</div>
                <div>Intake Screened</div>
                <div>PHQ-9 (Depr)</div>
                <div>GAD-7 (Anx)</div>
                <div className="text-right">Actions</div>
              </div>

              {/* Patient Feed rows */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                {isLoading ? (
                  <div className="p-8 text-center text-xs text-slate-500">Contacting secure core database api module...</div>
                ) : filteredAssessments.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">No active patient intake sheets matches this criteria.</div>
                ) : (
                  filteredAssessments.map((a) => {
                    const isSelected = selectedAssessment?.id === a.id;
                    return (
                      <div
                        key={a.id}
                        onClick={() => {
                          setSelectedAssessment(a);
                          setClinicianNotes(a.clinicianNotes || '');
                          setSaveStatus('idle');
                        }}
                        className={`grid grid-cols-6 px-4 py-3 items-center hover:bg-slate-50 transition-colors cursor-pointer ${
                          isSelected ? 'bg-blue-50/50 hover:bg-blue-50' : ''
                        }`}
                      >
                        <div className="col-span-2 pr-2">
                          <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="font-mono text-[10px] text-slate-400">#{a.id}</span>
                            <span className="truncate">{a.patientName}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate mt-0.5">{a.patientEmail}</div>
                        </div>

                        <div className="text-[10px] text-slate-500 font-mono">
                          {new Date(a.createdAt).toLocaleDateString()}<br />
                          {new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>

                        <div>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${getPhqSeverityColor(a.phqSeverity)}`}>
                            {a.phqScore} ({a.phqSeverity})
                          </span>
                        </div>

                        <div>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${getGadSeverityColor(a.gadSeverity)}`}>
                            {a.gadScore} ({a.gadSeverity})
                          </span>
                        </div>

                        <div className="text-right flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {deletingId === a.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDeleteAssessment(a.id)}
                                className="bg-red-600 hover:bg-red-700 text-white text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded transition-colors"
                              >
                                Delete
                              </button>
                              <button
                                onClick={() => setDeletingId(null)}
                                className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedAssessment(a);
                                  setClinicianNotes(a.clinicianNotes || '');
                                  setSaveStatus('idle');
                                }}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded transition-colors"
                              >
                                Review
                              </button>
                              <button
                                onClick={() => setDeletingId(a.id)}
                                className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                                title="Delete intake record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Evaluative Side Panel with single screen view of question breakdown */}
            <AnimatePresence>
              {selectedAssessment && (
                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 50 }}
                  className="w-2/5 bg-white border border-slate-200 rounded-lg flex flex-col overflow-hidden"
                >
                  {/* Panel view header */}
                  <div className="p-4 bg-slate-900 text-white flex items-center justify-between flex-shrink-0">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-blue-400 tracking-wider">Evaluation Sheet</span>
                      <h3 className="text-xs font-bold font-mono tracking-tight">INTAKE CONFIRM #{selectedAssessment.id}</h3>
                    </div>
                    <button
                      onClick={() => setSelectedAssessment(null)}
                      className="text-slate-400 hover:text-white text-xs font-bold uppercase px-2 py-1"
                    >
                      Close
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-5">
                    {/* Demographics details */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-slate-700">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Name: <strong>{selectedAssessment.patientName}</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-700">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Email: <span className="font-mono">{selectedAssessment.patientEmail}</span></span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-700">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Submitted: <span className="font-mono">{new Date(selectedAssessment.createdAt).toLocaleString()}</span></span>
                      </div>
                    </div>

                    {/* Export Actions Box */}
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg space-y-2">
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Document Export Utilities</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => exportToPDF(selectedAssessment)}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900 border border-slate-800 text-white rounded text-[10px] font-bold uppercase hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <Download className="w-3 h-3 text-red-500" />
                          <span>Clinical PDF</span>
                        </button>
                        <button
                          onClick={() => exportToWord(selectedAssessment)}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900 border border-slate-800 text-white rounded text-[10px] font-bold uppercase hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <FileText className="w-3 h-3 text-blue-500" />
                          <span>MS Word doc</span>
                        </button>
                      </div>
                    </div>

                    {/* Administrative Controls */}
                    <div className="bg-red-50 border border-red-200/80 p-3 rounded-lg space-y-2" onClick={(e) => e.stopPropagation()}>
                      <p className="text-[9px] font-bold text-red-600 uppercase tracking-widest">Administrative Actions</p>
                      {deletingId === selectedAssessment.id ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDeleteAssessment(selectedAssessment.id)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold uppercase transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3 text-white" />
                            <span>Confirm Delete</span>
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] font-bold uppercase transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingId(selectedAssessment.id)}
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded text-[10px] font-bold uppercase transition-all duration-150 cursor-pointer"
                        >
                          <Trash2 className="w-3" />
                          <span>Delete Assessment Record</span>
                        </button>
                      )}
                    </div>

                    {/* Question Breakdown Section */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-100">Score Breakdowns</h4>

                      {/* PHQ-9 (9 items) */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                          <span>PHQ-9 (Depression Checklist)</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${getPhqSeverityColor(selectedAssessment.phqSeverity)}`}>
                            {selectedAssessment.phqScore}/27
                          </span>
                        </div>
                        <div className="space-y-1 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100 text-[11px] leading-relaxed max-h-48 overflow-y-auto">
                          {PHQ9_QUESTIONS.map((q, idx) => {
                            const val = selectedAssessment.phqAnswers[idx];
                            return (
                              <div key={idx} className="flex justify-between py-1 border-b border-slate-100/50 last:border-0">
                                <span className="text-slate-600 font-medium pr-3">{idx + 1}. {q}</span>
                                <span className={`font-mono font-bold font-xs ${val > 0 ? (idx === 8 ? 'text-red-600' : 'text-blue-600') : 'text-slate-400'}`}>{val}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* GAD-7 (7 items) */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                          <span>GAD-7 (Anxiety Checklist)</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${getGadSeverityColor(selectedAssessment.gadSeverity)}`}>
                            {selectedAssessment.gadScore}/21
                          </span>
                        </div>
                        <div className="space-y-1 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100 text-[11px] leading-relaxed max-h-48 overflow-y-auto">
                          {GAD7_QUESTIONS.map((q, idx) => {
                            const val = selectedAssessment.gadAnswers[idx];
                            return (
                              <div key={idx} className="flex justify-between py-1 border-b border-slate-100/50 last:border-0">
                                <span className="text-slate-600 font-medium pr-3">{idx + 1}. {q}</span>
                                <span className={`font-mono font-bold font-xs ${val > 0 ? 'text-blue-600' : 'text-slate-400'}`}>{val}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Clinician Active Review Note */}
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-100">Clinician Evaluation Case Notes</h4>
                      <textarea
                        value={clinicianNotes}
                        onChange={(e) => setClinicianNotes(e.target.value)}
                        placeholder="Type evaluative comments, medication notes, outreach attempts, actions, or clinical dispositions..."
                        className="w-full text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:ring-1 focus:ring-slate-900 outline-none rounded p-2.5 h-24"
                      />
                      <div className="flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleUpdateNotes(selectedAssessment.id)}
                          disabled={saveStatus === 'saving'}
                          className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded text-[10px] font-bold uppercase hover:bg-slate-800 cursor-pointer disabled:opacity-50"
                        >
                          <Save className="w-3 h-3" />
                          <span>{saveStatus === 'saving' ? 'Saving note...' : 'Save Evaluative Notes'}</span>
                        </button>
                        {saveStatus === 'saved' && (
                          <span className="text-green-600 font-semibold text-[10px] flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            <span>Saved Note Successfully</span>
                          </span>
                        )}
                        {saveStatus === 'error' && (
                          <span className="text-red-600 font-semibold text-[10px]">Error saving note</span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
