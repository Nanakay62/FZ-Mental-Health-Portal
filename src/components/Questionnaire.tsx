import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ClipboardList, ArrowRight, ArrowLeft, CheckCircle2, ShieldCheck, Heart } from 'lucide-react';
import { PHQ9_QUESTIONS, GAD7_QUESTIONS, SCORING_OPTIONS, computeAssessment } from '../utils/scoring.ts';

interface QuestionnaireProps {
  onSubmitSuccess: (data: any) => void;
}

export default function Questionnaire({ onSubmitSuccess }: QuestionnaireProps) {
  const [step, setStep] = useState<'intro' | 'questions' | 'success'>('intro');
  const [patientName, setPatientName] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  
  // Scoring state
  const [phqAnswers, setPhqAnswers] = useState<number[]>(new Array(PHQ9_QUESTIONS.length).fill(-1));
  const [gadAnswers, setGadAnswers] = useState<number[]>(new Array(GAD7_QUESTIONS.length).fill(-1));
  
  // Current question index (0 to 15)
  // 0-8: PHQ-9 questions
  // 9-15: GAD-7 questions
  const [currentIdx, setCurrentIdx] = useState(0);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState<any>(null);

  const totalQuestions = PHQ9_QUESTIONS.length + GAD7_QUESTIONS.length;

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!patientEmail.trim() || !patientEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    setStep('questions');
    setCurrentIdx(0);
  };

  const isPhq = currentIdx < PHQ9_QUESTIONS.length;
  const activeQuestionList = isPhq ? PHQ9_QUESTIONS : GAD7_QUESTIONS;
  const relativeIdx = isPhq ? currentIdx : currentIdx - PHQ9_QUESTIONS.length;
  const currentQuestionText = activeQuestionList[relativeIdx];

  const handleAnswerSelect = (value: number) => {
    if (isPhq) {
      const updated = [...phqAnswers];
      updated[relativeIdx] = value;
      setPhqAnswers(updated);
    } else {
      const updated = [...gadAnswers];
      updated[relativeIdx] = value;
      setGadAnswers(updated);
    }

    // Auto-advance with clean timing
    setTimeout(() => {
      if (currentIdx < totalQuestions - 1) {
        setCurrentIdx(currentIdx + 1);
      }
    }, 250);
  };

  const handleBack = () => {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
    } else {
      setStep('intro');
    }
  };

  const getCurrentAnswerValue = () => {
    return isPhq ? phqAnswers[relativeIdx] : gadAnswers[relativeIdx];
  };

  const handleFinalSubmit = async () => {
    // Validate all answered
    if (phqAnswers.includes(-1) || gadAnswers.includes(-1)) {
      setError('Please answer all questions before submitting.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    const scores = computeAssessment(phqAnswers, gadAnswers);

    try {
      const res = await fetch('/api/assessments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientName,
          patientEmail,
          phqAnswers,
          gadAnswers,
          ...scores
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Failed to submit assessment.');
      }

      const savedData = await res.json();
      setAssessmentResult(savedData);
      setStep('success');
      onSubmitSuccess(savedData);
    } catch (err: any) {
      setError(err?.message || 'An error occurred during submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Percent complete
  const progressPercent = Math.round((currentIdx / totalQuestions) * 100);

  return (
    <div className="w-full max-w-xl mx-auto bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden flex flex-col min-h-[500px]">
      <AnimatePresence mode="wait">
        {step === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="p-8 flex-1 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-3 text-blue-600 mb-6">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100">
                  <ClipboardList className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">FZ Safety and Health</h2>
                  <p className="text-xs text-slate-500">Mental Health Assessment Portal</p>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <p className="text-sm text-slate-600 leading-relaxed">
                  Welcome to our private and secure mental health screening portal. This assistant helps you self-report clinical depression and anxiety symptoms using validated standardized questionnaires.
                </p>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-2">Private & Protected</span>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <ShieldCheck className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>Your answers are encrypted and delivered directly to your healthcare provider.</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleStart} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Your Full Name</label>
                  <input
                    type="text"
                    required
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="Enter full name"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Email Address</label>
                  <input
                    type="email"
                    required
                    value={patientEmail}
                    onChange={(e) => setPatientEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    pattern="[a-z0-9._%+-]+@[a-z0-0.-]+\.[a-z]{2,4}$"
                  />
                </div>
                {error && (
                  <p className="text-xs font-semibold text-red-600">{error}</p>
                )}
              </form>
            </div>

            <div className="mt-8">
              <button
                onClick={handleStart}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg px-6 py-3.5 text-sm flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                <span>Continue to Assessment</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {step === 'questions' && (
          <motion.div
            key="questions"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="p-8 flex-1 flex flex-col justify-between"
          >
            <div>
              {/* Header indicators */}
              <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-3">
                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded uppercase text-[10px] font-bold">
                  {isPhq ? 'Section 1: PHQ-9 (Depression)' : 'Section 2: GAD-7 (Anxiety)'}
                </span>
                <span>Question {currentIdx + 1} of {totalQuestions}</span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-8">
                <div
                  className="bg-blue-600 h-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>

              {/* Conversational prompt */}
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Over the last 2 weeks, how often have you been bothered by:</p>
              
              {/* Animated question string */}
              <AnimatePresence mode="wait">
                <motion.h3
                  key={currentIdx}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className="text-lg font-bold text-slate-800 leading-snug min-h-[56px]"
                >
                  {currentQuestionText}
                </motion.h3>
              </AnimatePresence>

              {/* Options list */}
              <div className="space-y-2.5 mt-6">
                {SCORING_OPTIONS.map((opt) => {
                  const isSelected = getCurrentAnswerValue() === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => handleAnswerSelect(opt.value)}
                      className={`w-full text-left px-5 py-4 border rounded-lg text-sm font-medium transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 text-blue-800 ring-2 ring-blue-100'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span>{opt.label}</span>
                      <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs font-mono font-bold ${
                        isSelected
                          ? 'border-blue-500 bg-blue-600 text-white'
                          : 'border-slate-300 bg-white text-slate-400'
                      }`}>
                        {opt.value}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Nav Action Bar */}
            <div className="mt-8 border-t border-slate-100 pt-5 flex items-center justify-between">
              <button
                onClick={handleBack}
                className="text-slate-500 hover:text-slate-800 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 py-2 px-1 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              {currentIdx === totalQuestions - 1 && getCurrentAnswerValue() !== -1 ? (
                <button
                  onClick={handleFinalSubmit}
                  disabled={isSubmitting}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg px-6 py-3 text-xs uppercase tracking-wider shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Submitting...' : 'Complete & Submit'}
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (getCurrentAnswerValue() !== -1 && currentIdx < totalQuestions - 1) {
                      setCurrentIdx(currentIdx + 1);
                    }
                  }}
                  disabled={getCurrentAnswerValue() === -1}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg px-5 py-3 text-xs uppercase tracking-wider shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Next Question
                </button>
              )}
            </div>
            {error && (
              <p className="text-xs font-semibold text-red-600 mt-3 text-center">{error}</p>
            )}
          </motion.div>
        )}

        {step === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-8 flex-1 flex flex-col items-center justify-center text-center bg-slate-50/50"
          >
            <div className="w-16 h-16 bg-green-50 rounded-full border border-green-100 flex items-center justify-center mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mb-2">Assessment Submitted</h2>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mb-10">
              Thank you, <strong>{patientName}</strong>. Your self-reporting response has been safely encrypted and sent to your clinical care team for review.
            </p>

            {assessmentResult && (
              <div className="w-full mb-10">
                <h3 className="text-sm font-bold text-slate-800 tracking-wide mb-6">Your Preliminary Results</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Depression (PHQ-9) */}
                  <div className="flex flex-col items-center p-6 bg-white border border-slate-100 rounded-2xl shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Depression <span className="font-medium text-slate-400 lowercase">(PHQ-9)</span></p>
                    <div className={`w-24 h-24 rounded-full border-8 flex items-center justify-center mb-4 ${
                      assessmentResult.phqSeverity.toLowerCase().includes('minimal') ? 'bg-green-50 border-green-100 text-green-700' :
                      assessmentResult.phqSeverity.toLowerCase().includes('mild') ? 'bg-yellow-50 border-yellow-100 text-yellow-700' :
                      (assessmentResult.phqSeverity.toLowerCase().includes('moderate') && !assessmentResult.phqSeverity.toLowerCase().includes('severe')) ? 'bg-orange-50 border-orange-100 text-orange-700' :
                      'bg-red-50 border-red-100 text-red-700'
                    }`}>
                      <span className="text-3xl font-black">{assessmentResult.phqScore}</span>
                    </div>
                    <p className="text-base font-bold text-slate-800">{assessmentResult.phqSeverity} Depression</p>
                  </div>
                  
                  {/* Anxiety (GAD-7) */}
                  <div className="flex flex-col items-center p-6 bg-white border border-slate-100 rounded-2xl shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Anxiety <span className="font-medium text-slate-400 lowercase">(GAD-7)</span></p>
                    <div className={`w-24 h-24 rounded-full border-8 flex items-center justify-center mb-4 ${
                      assessmentResult.gadSeverity.toLowerCase().includes('minimal') ? 'bg-green-50 border-green-100 text-green-700' :
                      assessmentResult.gadSeverity.toLowerCase().includes('mild') ? 'bg-yellow-50 border-yellow-100 text-yellow-700' :
                      (assessmentResult.gadSeverity.toLowerCase().includes('moderate') && !assessmentResult.gadSeverity.toLowerCase().includes('severe')) ? 'bg-orange-50 border-orange-100 text-orange-700' :
                      'bg-red-50 border-red-100 text-red-700'
                    }`}>
                      <span className="text-3xl font-black">{assessmentResult.gadScore}</span>
                    </div>
                    <p className="text-base font-bold text-slate-800">{assessmentResult.gadSeverity} Anxiety</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-center gap-3 w-full bg-white p-4 border border-slate-200 rounded-xl mb-8">
              <Heart className="w-5 h-5 text-rose-500 flex-shrink-0" />
              <span className="text-xs text-slate-600 text-left">If you are experiencing a mental health emergency, please contact <strong>988</strong> or go to the nearest emergency room.</span>
            </div>

            <button
              onClick={() => {
                setPatientName('');
                setPatientEmail('');
                setPhqAnswers(new Array(PHQ9_QUESTIONS.length).fill(-1));
                setGadAnswers(new Array(GAD7_QUESTIONS.length).fill(-1));
                setStep('intro');
                setAssessmentResult(null);
                setError('');
              }}
              className="bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg px-8 py-3.5 text-sm transition-all shadow-sm cursor-pointer"
            >
              Take Another Assessment
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
