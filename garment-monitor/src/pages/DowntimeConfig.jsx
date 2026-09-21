// src/pages/DowntimeConfig.jsx
// Factory-specific configuration for Downtime & Andon: categories, reasons and
// response/completion targets. Each tab is a reusable CRUD grid.
import { useState } from "react";
import CrudPage from "../components/CrudPage.jsx";
import { COL } from "../firebase/config.js";

const TABS = ["Downtime Categories", "Downtime Reasons", "Andon Categories", "Andon Reasons", "Targets"];

export default function DowntimeConfig() {
  const [tab, setTab] = useState(TABS[0]);
  return (
    <div className="space-y-4 p-3 md:p-5">
      <div>
        <h1 className="text-xl font-extrabold md:text-2xl">Downtime &amp; Andon Configuration</h1>
        <p className="text-xs text-slate-400">Categories, reasons and SLA targets per factory</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={"rounded-lg px-3 py-1.5 text-sm font-semibold transition " + (tab === t ? "bg-info text-white" : "bg-grid/40 text-slate-300 hover:bg-grid")}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Downtime Categories" && (
        <CrudPage title="Downtime Categories" subtitle="Machine, Material, Manpower, Quality… — each owned by a responsible department" col={COL.downtimeCategories}
          fields={[
            { key: "name", label: "Category", type: "text", required: true },
            { key: "factoryId", label: "Factory", type: "select", optionsCol: COL.factories, required: true },
            { key: "departmentId", label: "Responsible Department", type: "select", optionsCol: COL.departments, optionLabel: (o) => o.name },
            { key: "status", label: "Status", type: "status", default: "Active" },
          ]} />
      )}
      {tab === "Downtime Reasons" && (
        <CrudPage title="Downtime Reasons" subtitle="e.g. MC001 — Machine Breakdown" col={COL.downtimeReasons}
          fields={[
            { key: "code", label: "Reason Code", type: "text", required: true },
            { key: "description", label: "Description", type: "text", required: true },
            { key: "categoryId", label: "Category", type: "select", optionsCol: COL.downtimeCategories },
            { key: "factoryId", label: "Factory", type: "select", optionsCol: COL.factories, required: true },
            { key: "status", label: "Status", type: "status", default: "Active" },
          ]} />
      )}
      {tab === "Andon Categories" && (
        <CrudPage title="Andon Categories" subtitle="Maintenance, Quality, Production… — each owned by a responsible department" col={COL.andonCategories}
          fields={[
            { key: "name", label: "Category", type: "text", required: true },
            { key: "factoryId", label: "Factory", type: "select", optionsCol: COL.factories, required: true },
            { key: "departmentId", label: "Responsible Department", type: "select", optionsCol: COL.departments, optionLabel: (o) => o.name },
            { key: "status", label: "Status", type: "status", default: "Active" },
          ]} />
      )}
      {tab === "Andon Reasons" && (
        <CrudPage title="Andon Reasons" subtitle="e.g. AN001 — Machine Assistance" col={COL.andonReasons}
          fields={[
            { key: "code", label: "Andon Code", type: "text", required: true },
            { key: "description", label: "Description", type: "text", required: true },
            { key: "categoryId", label: "Category", type: "select", optionsCol: COL.andonCategories },
            { key: "factoryId", label: "Factory", type: "select", optionsCol: COL.factories, required: true },
            { key: "status", label: "Status", type: "status", default: "Active" },
          ]} />
      )}
      {tab === "Targets" && (
        <CrudPage title="SLA Targets" subtitle="Attend & completion targets (minutes), per factory / department" col={COL.targets}
          fields={[
            { key: "factoryId", label: "Factory", type: "select", optionsCol: COL.factories, required: true },
            { key: "departmentId", label: "Department (blank = factory-wide)", type: "select", optionsCol: COL.departments,
              optionLabel: (o) => `${o.name}` },
            { key: "kind", label: "Applies to", type: "select", options: [["", "Both"], ["downtime", "Downtime"], ["andon", "Andon"]] },
            { key: "attendTarget", label: "Attend target (min)", type: "number", required: true },
            { key: "completeTarget", label: "Completion target (min)", type: "number", required: true },
          ]} />
      )}
    </div>
  );
}
