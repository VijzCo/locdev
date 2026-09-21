import { ScaffoldPage } from '@/components/shared/scaffold-page';

export default function ReportsPage() {
  return (
    <ScaffoldPage
      title="Reports"
      description="Production efficiency, output, and SMV/CM analytics."
      nextSteps={[
        "Aggregate operationBulletins + lineBalances + production records into daily summaries via a Cloud Function",
        "Use Recharts (already installed) for trend lines and bar charts",
        "Add Excel export using the xlsx package (already installed) for IE staff",
        "Use jspdf + jspdf-autotable to generate printable A4 reports",
        "Gate behind reports.read permission (already enforced in sidebar)",
      ]}
    />
  );
}
