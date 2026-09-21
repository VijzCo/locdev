import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative grid min-h-screen lg:grid-cols-2">
      {/* Left: Brand panel */}
      <div className="relative hidden bg-steel-900 text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0 bg-blueprint opacity-10" aria-hidden />
        <div className="relative">
          <Link href="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded bg-accent text-steel-900">
              <span className="font-display text-sm font-bold">IE</span>
            </div>
            <span className="font-display text-lg font-bold">SMV Platform</span>
          </Link>
        </div>
        <div className="relative">
          <blockquote className="text-xl font-light leading-relaxed">
            &ldquo;Run your IE department like a factory, not a spreadsheet.&rdquo;
          </blockquote>
          <p className="mt-4 text-sm text-steel-300">
            SMV · CPM · CM · Line Balance · OB · Time Study
          </p>
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex flex-col items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
