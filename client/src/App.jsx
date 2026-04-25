import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { StressStrainPage } from "./pages/StressStrainPage";
import { BeamDeflectionPage } from "./pages/BeamDeflectionPage";
import { ShaftTorsionPage } from "./pages/ShaftTorsionPage";
import { MaterialSelectorPage } from "./pages/MaterialSelectorPage";
import { UnitConverterPage } from "./pages/UnitConverterPage";
import { HistoryPage } from "./pages/HistoryPage";
import { HeatTransferPage } from "./pages/HeatTransferPage";
import { FiniteElementPage } from "./pages/FiniteElementPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="stress-strain" element={<StressStrainPage />} />
        <Route path="beam-deflection" element={<BeamDeflectionPage />} />
        <Route path="shaft-torsion" element={<ShaftTorsionPage />} />
        <Route path="heat-transfer" element={<HeatTransferPage />} />
        <Route path="finite-element" element={<FiniteElementPage />} />
        <Route path="material-selector" element={<MaterialSelectorPage />} />
        <Route path="unit-converter" element={<UnitConverterPage />} />
        <Route path="history" element={<HistoryPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
