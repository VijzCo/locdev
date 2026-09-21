export default function Loader({ full, label = "Loading…" }) {
  return (
    <div
      className={
        (full ? "h-screen " : "h-40 ") +
        "flex w-full flex-col items-center justify-center gap-3 text-slate-400"
      }
    >
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-grid border-t-info" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
