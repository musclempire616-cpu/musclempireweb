import type { AssessmentData } from "./assessments";

// Module-level store — persists across navigation within the same tab session
let selectedAssessment: AssessmentData | null = null;

export function setSelectedAssessment(data: AssessmentData) {
  selectedAssessment = data;
}

export function getSelectedAssessment(): AssessmentData | null {
  return selectedAssessment;
}

export function clearSelectedAssessment() {
  selectedAssessment = null;
}
