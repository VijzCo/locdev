import CrudPage from "../components/CrudPage.jsx";
import { COL } from "../firebase/config.js";
export default function Styles() {
  return (
    <CrudPage title="Styles" subtitle="Buyer styles and standard minute values" col={COL.styles}
      fields={[
        { key: "number", label: "Style No.", type: "text", required: true },
        { key: "buyer", label: "Buyer", type: "text" },
        { key: "productType", label: "Product Type", type: "text" },
        { key: "smv", label: "SMV", type: "number", step: "0.01", required: true },
        { key: "plannedEffPct", label: "Planned Eff %", type: "number", default: 75 },
        { key: "status", label: "Status", type: "status", default: "Active" },
      ]} />
  );
}
