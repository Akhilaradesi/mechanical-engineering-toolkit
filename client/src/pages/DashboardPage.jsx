import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../api/apiClient";
import { PageHeader } from "../components/common/PageHeader";
import { StatCard } from "../components/common/StatCard";

const tools = [
  { title: "Stress & Strain", path: "/stress-strain", formula: "sigma = F / A" },
  { title: "Beam Deflection", path: "/beam-deflection", formula: "delta = P L^3 / (3 E I) or (48 E I)" },
  { title: "Shaft Torsion", path: "/shaft-torsion", formula: "tau = T r / J" },
  { title: "Heat Transfer", path: "/heat-transfer", formula: "Conduction, convection, fins, transient, HX" },
  { title: "Finite Element", path: "/finite-element", formula: "Bar, truss, CST, mass matrix, BC methods" },
  { title: "Material Selector", path: "/material-selector", formula: "Rank by strength, weight, and cost" },
  { title: "Unit Converter", path: "/unit-converter", formula: "x_target = x_base / factor_target" },
  { title: "History", path: "/history", formula: "Stored records from JSON API" }
];

export function DashboardPage() {
  const [historyCount, setHistoryCount] = useState(0);
  const [lastCalculation, setLastCalculation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    const loadHistory = async () => {
      try {
        const payload = await apiClient.getHistory();
        if (ignore) return;
        setHistoryCount(payload.history.length);
        setLastCalculation(payload.history[0] || null);
      } catch {
        if (!ignore) {
          setHistoryCount(0);
          setLastCalculation(null);
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };

    loadHistory();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div>
      <PageHeader
        title="Mechanical Engineering Toolkit"
        description="A portfolio-grade workspace for core mechanical design calculations, analysis previews, and exportable engineering reports."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Available Tools" value={tools.length} hint="Calculators + material + converter + history" />
        <StatCard label="Saved Calculations" value={isLoading ? "..." : historyCount} hint="Persisted in server JSON storage" />
        <StatCard
          label="Last Activity"
          value={lastCalculation ? lastCalculation.tool : "No data"}
          hint={lastCalculation ? new Date(lastCalculation.timestamp).toLocaleString() : "Run any calculator to start"}
        />
        <StatCard label="Backend APIs" value="6+" hint="REST routes for calculations, materials, and history" />
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tools.map((tool) => (
          <article key={tool.path} className="app-surface">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{tool.title}</h2>
            <p className="mono mt-3 rounded-lg bg-slate-900 px-3 py-2 text-sm text-cyan-200 dark:bg-slate-950">{tool.formula}</p>
            <Link
              to={tool.path}
              className="mt-4 inline-flex rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500"
            >
              Open Tool
            </Link>
          </article>
        ))}
      </section>
    </div>
  );
}
