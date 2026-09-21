import CrudPage from "../components/CrudPage.jsx";
import { COL } from "../firebase/config.js";
export default function Sections() {
  return (
    <CrudPage title="Sections" subtitle="Sub-areas within a department" col={COL.sections}
      fields={[
        { key: "code", label: "Section Code", type: "text", required: true },
        { key: "name", label: "Section Name", type: "text", required: true },
        { key: "factoryId", label: "Factory", type: "select", optionsCol: COL.factories, required: true },
        { key: "departmentId", label: "Department", type: "select", optionsCol: COL.departments,
          optionLabel: (o) => `${o.name} (${o.code})` },
        { key: "status", label: "Status", type: "status", default: "Active" },
      ]} />
  );
}
