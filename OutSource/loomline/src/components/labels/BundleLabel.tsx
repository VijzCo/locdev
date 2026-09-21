import { Barcode } from './Barcode';
import type { Bundle } from '@/types/domain';

export interface LabelConfig {
  widthMm: number;
  heightMm: number;
  barcodeHeightMm: number;
  showCompany: boolean;
  companyName: string;
}

interface Props {
  bundle: Bundle;
  poNumber: string;
  styleCode: string;
  config: LabelConfig;
  /** Marks a label that has been printed before (§28 requires the trail). */
  reprint?: boolean;
}

/**
 * One physical label. Everything is sized in millimetres so what appears on
 * screen matches what leaves the printer.
 *
 * Layout priority follows what a person on the floor actually needs at a
 * glance: size and quantity are the largest text, because a supervisor
 * sorting a trolley of bundles reads those two and nothing else. The
 * human-readable id sits under the barcode as the fallback when a scanner
 * fails or a label is damaged, which is the only reason it is printed at
 * all.
 */
export function BundleLabel({ bundle, poNumber, styleCode, config, reprint }: Props) {
  const pad = 2;
  const inner = config.widthMm - pad * 2;

  return (
    <div
      className="label-sheet-item relative overflow-hidden bg-white text-black"
      style={{
        width: `${config.widthMm}mm`,
        height: `${config.heightMm}mm`,
        padding: `${pad}mm`,
        fontFamily: 'Barlow, sans-serif',
        border: '1px solid #d5dde6',
      }}
    >
      <div className="flex items-start justify-between" style={{ fontSize: '2.2mm' }}>
        <span style={{ fontWeight: 600, letterSpacing: '0.04em' }}>
          {config.showCompany ? config.companyName : poNumber}
        </span>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace' }}>{styleCode}</span>
      </div>

      <div
        className="flex items-baseline justify-between"
        style={{ marginTop: '0.6mm', fontSize: '2.2mm' }}
      >
        <span style={{ fontFamily: 'IBM Plex Mono, monospace' }}>{poNumber}</span>
        <span>{bundle.colour}</span>
      </div>

      {/* The two figures a supervisor reads from a trolley. */}
      <div
        className="flex items-baseline justify-between"
        style={{ marginTop: '0.4mm', lineHeight: 1 }}
      >
        <span style={{ fontSize: '6mm', fontWeight: 700, letterSpacing: '-0.02em' }}>
          {bundle.size}
        </span>
        <span
          style={{
            fontSize: '6mm',
            fontWeight: 700,
            fontFamily: 'IBM Plex Mono, monospace',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {bundle.qty}
        </span>
      </div>

      <div style={{ marginTop: '0.8mm' }}>
        <Barcode
          value={bundle.id}
          heightMm={config.barcodeHeightMm}
          widthMm={inner}
        />
      </div>

      <div
        style={{
          fontSize: '2mm',
          fontFamily: 'IBM Plex Mono, monospace',
          textAlign: 'center',
          letterSpacing: '0.02em',
          marginTop: '0.3mm',
        }}
      >
        {bundle.id}
      </div>

      {reprint && (
        <span
          style={{
            position: 'absolute',
            top: `${pad}mm`,
            right: `${pad}mm`,
            fontSize: '1.8mm',
            border: '0.2mm solid black',
            padding: '0.2mm 0.6mm',
          }}
        >
          RE
        </span>
      )}
    </div>
  );
}
