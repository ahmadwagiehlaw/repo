import CaseForm from '@/components/cases/CaseForm.jsx';

export default function CaseEditTab({ caseData, onSave }) {
  return <CaseForm caseData={caseData} onSave={onSave} />;
}
