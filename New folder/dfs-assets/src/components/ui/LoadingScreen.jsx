// src/components/ui/LoadingScreen.jsx
export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-dark-900 flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center">
        <span className="text-white font-display font-bold text-lg">D</span>
      </div>
      <div className="flex gap-1">
        {[0,1,2].map(i => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <p className="font-mono text-xs text-dark-500 tracking-widest uppercase">Loading…</p>
    </div>
  )
}
