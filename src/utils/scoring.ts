export const PHQ9_QUESTIONS = [
  "Little interest or pleasure in doing things",
  "Feeling down, depressed, or hopeless",
  "Trouble falling or staying asleep, or sleeping too much",
  "Feeling tired or having little energy",
  "Poor appetite or overeating",
  "Feeling bad about yourself — or that you are a failure or have let yourself or your family down",
  "Trouble concentrating on things, such as reading the newspaper or watching television",
  "Moving or speaking so slowly that other people could have noticed? Or the opposite — being so restless or fidgety that you have been moving around a lot more than usual",
  "Thoughts that you would be better off dead or of hurting yourself in some way"
];

export const GAD7_QUESTIONS = [
  "Feeling nervous, anxious, or on edge",
  "Not being able to stop or control worrying",
  "Worrying too much about different things",
  "Trouble relaxing",
  "Being so restless that it is hard to sit still",
  "Becoming easily annoyed or irritable",
  "Feeling afraid as if something awful might happen"
];

export const SCORING_OPTIONS = [
  { value: 0, label: "Not at all" },
  { value: 1, label: "Several days" },
  { value: 2, label: "More than half the days" },
  { value: 3, label: "Nearly every day" }
];

export function calculatePhq9Severity(score: number): typeof PHQ9_SEVERITIES[number]["label"] {
  if (score >= 20) return "Severe";
  if (score >= 15) return "Moderately Severe";
  if (score >= 10) return "Moderate";
  if (score >= 5) return "Mild";
  return "Minimal";
}

export function calculateGad7Severity(score: number): typeof GAD7_SEVERITIES[number]["label"] {
  if (score >= 15) return "Severe";
  if (score >= 10) return "Moderate";
  if (score >= 5) return "Mild";
  return "Minimal";
}

export const PHQ9_SEVERITIES = [
  { range: [0, 4], label: "Minimal" as const, color: "bg-slate-100 text-slate-700 border-slate-200" },
  { range: [5, 9], label: "Mild" as const, color: "bg-green-100 text-green-700 border-green-200" },
  { range: [10, 14], label: "Moderate" as const, color: "bg-amber-100 text-amber-700 border-amber-200" },
  { range: [15, 19], label: "Moderately Severe" as const, color: "bg-orange-100 text-orange-700 border-orange-200" },
  { range: [20, 27], label: "Severe" as const, color: "bg-red-100 text-red-700 border-red-200" }
];

export const GAD7_SEVERITIES = [
  { range: [0, 4], label: "Minimal" as const, color: "bg-slate-100 text-slate-700 border-slate-200" },
  { range: [5, 9], label: "Mild" as const, color: "bg-green-100 text-green-700 border-green-200" },
  { range: [10, 14], label: "Moderate" as const, color: "bg-amber-100 text-amber-700 border-amber-200" },
  { range: [15, 21], label: "Severe" as const, color: "bg-red-100 text-red-700 border-red-200" }
];

export function getPhqSeverityColor(severity: string): string {
  const sev = PHQ9_SEVERITIES.find(s => s.label.toLowerCase() === severity.toLowerCase());
  return sev ? sev.color : "bg-slate-100 text-slate-700 border-slate-200";
}

export function getGadSeverityColor(severity: string): string {
  const sev = GAD7_SEVERITIES.find(s => s.label.toLowerCase() === severity.toLowerCase());
  return sev ? sev.color : "bg-slate-100 text-slate-700 border-slate-200";
}

export interface ScoringResult {
  phqScore: number;
  gadScore: number;
  phqSeverity: string;
  gadSeverity: string;
  hasQ9Alert: boolean;
}

export function computeAssessment(phqAnswers: number[], gadAnswers: number[]): ScoringResult {
  const phqScore = phqAnswers.reduce((sum, val) => sum + val, 0);
  const gadScore = gadAnswers.reduce((sum, val) => sum + val, 0);
  
  const phqSeverity = calculatePhq9Severity(phqScore);
  const gadSeverity = calculateGad7Severity(gadScore);
  
  // Q9 corresponds to index 8 of phqAnswers
  const hasQ9Alert = phqAnswers.length >= 9 && phqAnswers[8] > 0;
  
  return {
    phqScore,
    gadScore,
    phqSeverity,
    gadSeverity,
    hasQ9Alert
  };
}
