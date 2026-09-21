'use client';

import { OperationBulletinEditor } from '@/components/ob/operation-bulletin-editor';

export default function OperationBulletinPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Operation Bulletin
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Build the per-style production sequence. SMVs roll up automatically — this is the
          source of truth for costing and line balancing.
        </p>
      </div>

      <OperationBulletinEditor />
    </div>
  );
}
