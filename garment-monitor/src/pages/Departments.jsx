import CrudPage from "../components/CrudPage.jsx";
import { COL } from "../firebase/config.js";
export default function Departments() {
  return (
    <CrudPage title="Departments" subtitle="Sewing, Cutting, Finishing, Quality…" col={COL.departments}
      fields={[
        { key: "code", label: "Dept Code", type: "text", required: true },
        { key: "name", label: "Department Name", type: "text", required: true },
        { key: "factoryId", label: "Factory", type: "select", optionsCol: COL.factories, required: true },
        { key: "status", label: "Status", type: "status", default: "Active" },
      ]} />
  );
}
