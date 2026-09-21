// src/pages/Notifications.jsx
// Notification center — realtime list of downtime/andon/access events written to
// the notifications collection. Mark individual or all as read.
import { useMemo } from "react";
import { orderBy, limit as fbLimit } from "firebase/firestore";
import { COL } from "../firebase/config.js";
import { useCollection } from "../hooks/useCollection.js";
import { patchDoc } from "../firebase/db.js";
import { useAuth } from "../context/AuthContext.jsx";
import { scopeFactories } from "../lib/roles.js";

const ICON = { downtime: "◬", andon: "🔔", access: "🔑" };
const iconFor = (t = "") => (t.includes("andon") ? ICON.andon : t.includes("access") ? ICON.access : ICON.downtime);

export default function Notifications() {
  const { user } = useAuth();
  const all = useCollection(COL.notifications, [orderBy("createdAt", "desc"), fbLimit(300)], []).data;
  const factories = scopeFactories(user, useCollection(COL.factories, [], []).data, "id");
  const facIds = new Set(factories.map((f) => f.id));

  const list = useMemo(
    () => all.filter((n) => !n.factoryId || facIds.has(n.factoryId) || user?.role === "super_admin"),
    [all, facIds, user]
  );
  const unread = list.filter((n) => !n.read);
  const markAll = () => unread.forEach((n) => patchDoc(COL.notifications, n.id, { read: true }));

  return (
    <div className="space-y-4 p-3 md:p-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold md:text-2xl">Notifications</h1>
          <p className="text-xs text-slate-400">{unread.length} unread of {list.length}</p>
        </div>
        {unread.length > 0 && <button className="btn bg-grid/60 text-xs hover:bg-grid" onClick={markAll}>Mark all read</button>}
      </div>

      <div className="space-y-2">
        {list.length === 0 && <div className="card p-8 text-center text-sm text-slate-500">No notifications.</div>}
        {list.map((n) => (
          <div key={n.id} className={"flex items-start gap-3 rounded-xl border p-3 " + (n.read ? "border-grid bg-card" : "border-info/40 bg-info/5")}>
            <span className="text-xl">{iconFor(n.type)}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{n.title}</span>
                {!n.read && <span className="pill bg-info/20 text-info">new</span>}
              </div>
              <div className="text-sm text-slate-400">{n.body}</div>
              <div className="mt-0.5 text-[11px] text-slate-500">{n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}</div>
            </div>
            {!n.read && <button className="text-[11px] text-info underline" onClick={() => patchDoc(COL.notifications, n.id, { read: true })}>read</button>}
          </div>
        ))}
      </div>
    </div>
  );
}
