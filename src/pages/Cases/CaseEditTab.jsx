import CaseForm from '@/components/cases/CaseForm.jsx';

export default function CaseEditTab({ caseData, onSave, onCancel, workspaceId, initialTab }) {
  return <CaseForm caseData={caseData} onSave={onSave} onCancel={onCancel} workspaceId={workspaceId} initialTab={initialTab} />;
}
