import CrudPage from "../components/CrudPage.jsx";
import { COL } from "../firebase/config.js";
export default function Factories() {
  return (
    <CrudPage title="Factories" subtitle="Create and manage production sites" col={COL.factories}
      fields={[
        { key: "name", label: "Factory Name", type: "text", required: true },
        { key: "code", label: "Factory Code", type: "text", required: true },
        { key: "address", label: "Address", type: "textarea" },
        { key: "status", label: "Status", type: "status", default: "Active" },
      ]} />
  );
}
