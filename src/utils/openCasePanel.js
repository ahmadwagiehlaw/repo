export function openCasePanel(caseId) {
  window.dispatchEvent(new CustomEvent('lawbase:open-case-panel', {
    detail: { caseId },
  }));
}