import { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';

interface Props {
  value: string;
  /** Height of the bars in millimetres. */
  heightMm: number;
  widthMm: number;
}

/**
 * Code 128 rendered as SVG rather than canvas, because thermal printers
 * rasterise vectors at their own head resolution — a canvas bitmap scaled to
 * a 50 mm label produces soft bar edges that scan poorly once the label is
 * smudged with cutting-room chalk.
 *
 * The encoder is JsBarcode rather than a hand-rolled one. Code 128's symbol
 * table and checksum are easy to get subtly wrong, and the failure mode is a
 * label that looks correct and does not scan — discovered on the floor, at
 * volume, after printing.
 */
export function Barcode({ value, heightMm, widthMm }: Props) {
  const ref = useRef<SVGSVGElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    try {
      JsBarcode(ref.current, value, {
        format: 'CODE128',
        // Millimetres to pixels at 96dpi; the SVG then scales cleanly.
        height: heightMm * 3.78,
        width: 1.4,
        displayValue: false,
        margin: 0,
        background: 'transparent',
        lineColor: '#000000',
      });
      setError(null);
    } catch {
      setError('Cannot encode');
    }
  }, [value, heightMm]);

  if (error) {
    return (
      <div
        style={{ height: `${heightMm}mm` }}
        className="flex items-center justify-center border border-dashed border-signal-red text-xs text-signal-red"
      >
        {error}: {value}
      </div>
    );
  }

  return (
    <svg
      ref={ref}
      style={{ width: `${widthMm}mm`, height: `${heightMm}mm` }}
      preserveAspectRatio="none"
    />
  );
}
