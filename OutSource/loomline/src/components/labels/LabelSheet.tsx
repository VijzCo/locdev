import { useEffect } from 'react';
import { BundleLabel, type LabelConfig } from './BundleLabel';
import { Button } from '@/components/ui/Button';
import type { Bundle, PurchaseOrder, Style } from '@/types/domain';

interface Props {
  bundles: Bundle[];
  pos: PurchaseOrder[];
  styles: Style[];
  config: LabelConfig;
  onClose: () => void;
  onPrinted: () => void;
}

/**
 * The print view. One label per page, sized exactly to the configured
 * stock, because bundle labels come off a roll on a dedicated thermal
 * printer rather than tiled on A4.
 *
 * The `@page` rule is injected at render rather than living in the
 * stylesheet, since the page size is configuration and can differ per
 * factory.
 */
export function LabelSheet({ bundles, pos, styles, config, onClose, onPrinted }: Props) {
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'label-page-rule';
    style.textContent = `
      @media print {
        @page { size: ${config.widthMm}mm ${config.heightMm}mm; margin: 0; }
        body * { visibility: hidden; }
        .label-sheet, .label-sheet * { visibility: visible; }
        .label-sheet {
          position: absolute; inset: 0;
          display: block; background: white; padding: 0;
        }
        .label-sheet-item {
          border: none !important;
          page-break-after: always;
          break-after: page;
        }
        .label-sheet-item:last-child { page-break-after: auto; break-after: auto; }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.getElementById('label-page-rule')?.remove();
    };
  }, [config.widthMm, config.heightMm]);

  async function print() {
    await onPrinted();
    window.print();
  }

  const poFor = (id: string) => pos.find((p) => p.id === id)?.poNumber ?? '—';
  const styleFor = (id: string) => styles.find((s) => s.id === id)?.code ?? '—';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-canvas">
      <div className="no-print flex items-center gap-3 border-b border-line bg-surface px-4 py-3">
        <div>
          <p className="eyebrow leading-none">Print preview</p>
          <p className="font-display text-lg uppercase tracking-[0.03em] leading-tight">
            {bundles.length} {bundles.length === 1 ? 'label' : 'labels'} · {config.widthMm} ×{' '}
            {config.heightMm} mm
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary" onClick={print}>
            Print
          </Button>
        </div>
      </div>

      <p className="no-print border-b border-line bg-raised px-4 py-2 text-sm text-muted">
        Set your printer to the same label size and turn off “fit to page” — scaling changes the
        barcode width and can make it unscannable. Test one label before running a full order.
      </p>

      <div className="label-sheet flex-1 overflow-y-auto scrollbar-slim p-4">
        <div className="flex flex-wrap gap-2">
          {bundles.map((b) => (
            <BundleLabel
              key={b.id}
              bundle={b}
              poNumber={poFor(b.poId)}
              styleCode={styleFor(b.styleId)}
              config={config}
              reprint={(b.printCount ?? 0) > 0}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
