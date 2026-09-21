import CrudPage from "../components/CrudPage.jsx";
import { COL } from "../firebase/config.js";
export default function Modules() {
  return (
    <CrudPage title="Modules" subtitle="Production lines / work units" col={COL.modules}
      fields={[
        { key: "number", label: "Module Code", type: "text", required: true },
        { key: "name", label: "Module Name", type: "text" },
        { key: "factoryId", label: "Factory", type: "select", optionsCol: COL.factories, required: true },
        { key: "departmentId", label: "Department", type: "select", optionsCol: COL.departments,
          optionLabel: (o) => `${o.name} (${o.code})` },
        { key: "sectionId", label: "Section", type: "select", optionsCol: COL.sections,
          optionLabel: (o) => `${o.name} (${o.code})` },
        { key: "supervisor", label: "Supervisor", type: "text" },
        { key: "floor", label: "Floor / Block", type: "text" },
        { key: "dailyTarget", label: "Default Daily Target", type: "number" },
        { key: "status", label: "Status", type: "status", default: "Active" },
      ]} />
  );
}
