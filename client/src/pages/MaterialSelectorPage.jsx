import { useEffect, useState } from "react";
import { apiClient } from "../api/apiClient";
import { PageHeader } from "../components/common/PageHeader";
import { ResultPanel } from "../components/common/ResultPanel";
import { useExportPdf } from "../hooks/useExportPdf";
import { copyText } from "../utils/clipboard";

export function MaterialSelectorPage() {
  const [materials, setMaterials] = useState([]);
  const [preferences, setPreferences] = useState({
    highStrength: false,
    lowWeight: false,
    lowCost: false
  });
  const [recommendation, setRecommendation] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRecommending, setIsRecommending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { exportElementAsPdf } = useExportPdf();

  useEffect(() => {
    let ignore = false;

    const loadMaterials = async () => {
      try {
        const payload = await apiClient.getMaterials();
        if (!ignore) setMaterials(payload.materials);
      } catch (error) {
        if (!ignore) setFeedback(error.message);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };

    loadMaterials();

    return () => {
      ignore = true;
    };
  }, []);

  const togglePreference = (event) => {
    const { name, checked } = event.target;
    setPreferences((current) => ({ ...current, [name]: checked }));
    setFeedback("");
  };

  const handleRecommend = async () => {
    setIsRecommending(true);
    setFeedback("");

    try {
      const payload = await apiClient.recommendMaterial(preferences);
      setRecommendation(payload);
      setFeedback("Recommendation generated.");
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setIsRecommending(false);
    }
  };

  const handleSave = async () => {
    if (!recommendation) return;

    setIsSaving(true);
    setFeedback("");

    try {
      await apiClient.saveCalculation({
        tool: "Material Selector",
        inputs: preferences,
        result: {
          recommended: recommendation.recommended,
          rankedMaterials: recommendation.rankedMaterials
        }
      });
      setFeedback("Recommendation saved to history.");
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      await exportElementAsPdf("material-recommend-export", "material-selection-report.pdf");
    } catch (error) {
      setFeedback(error.message);
    }
  };

  const handleCopyResult = async () => {
    if (!recommendation) return;

    try {
      await copyText(
        [
          "Material Selector Recommendation",
          `Preferences: strength=${preferences.highStrength}, weight=${preferences.lowWeight}, cost=${preferences.lowCost}`,
          `Recommended: ${recommendation.recommended.name}`,
          `Summary: ${recommendation.recommended.summary}`,
          ...recommendation.rankedMaterials.map((material, index) => `${index + 1}. ${material.name} (score: ${material.score})`)
        ].join("\n")
      );
      setFeedback("Result copied to clipboard.");
    } catch (error) {
      setFeedback(error.message);
    }
  };

  return (
    <div>
      <PageHeader
        title="Material Selector Tool"
        description="Choose engineering priorities and get ranked material recommendations from the available library."
      />

      <div className="grid gap-4 xl:grid-cols-[1.1fr,1fr]">
        <section className="app-surface space-y-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Design Priorities</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">Select one or more requirements before running the recommendation.</p>
          <label className="flex items-center gap-3 rounded-lg bg-slate-100 px-3 py-2.5 dark:bg-slate-800/80">
            <input
              type="checkbox"
              name="highStrength"
              checked={preferences.highStrength}
              onChange={togglePreference}
              className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
            />
            <span>High Strength</span>
          </label>
          <label className="flex items-center gap-3 rounded-lg bg-slate-100 px-3 py-2.5 dark:bg-slate-800/80">
            <input
              type="checkbox"
              name="lowWeight"
              checked={preferences.lowWeight}
              onChange={togglePreference}
              className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
            />
            <span>Low Weight</span>
          </label>
          <label className="flex items-center gap-3 rounded-lg bg-slate-100 px-3 py-2.5 dark:bg-slate-800/80">
            <input
              type="checkbox"
              name="lowCost"
              checked={preferences.lowCost}
              onChange={togglePreference}
              className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
            />
            <span>Low Cost</span>
          </label>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleRecommend}
              disabled={isRecommending}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isRecommending ? "Analyzing..." : "Recommend Material"}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!recommendation || isSaving}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              {isSaving ? "Saving..." : "Save Recommendation"}
            </button>
            <button
              type="button"
              onClick={handleCopyResult}
              disabled={!recommendation}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              Copy Result
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={!recommendation}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              Export PDF
            </button>
          </div>
          {feedback ? <p className="text-sm text-cyan-700 dark:text-cyan-300">{feedback}</p> : null}
        </section>

        <ResultPanel
          id="material-recommend-export"
          title="Recommendation Output"
          subtitle="Ranked result generated from selected preferences."
        >
          {recommendation ? (
            <div className="space-y-4">
              <div className="rounded-xl bg-cyan-600/10 p-4">
                <p className="text-sm text-slate-600 dark:text-slate-200">Recommended Material</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{recommendation.recommended.name}</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{recommendation.recommended.summary}</p>
              </div>
              <div className="space-y-2">
                {recommendation.rankedMaterials.map((material) => (
                  <div
                    key={material.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-white/70 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/60"
                  >
                    <span>{material.name}</span>
                    <span className="mono text-sm">Score: {material.score}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">Run recommendation to view ranked materials.</p>
          )}
        </ResultPanel>
      </div>

      <section className="app-surface mt-4">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Material Library</h2>
        {isLoading ? (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Loading materials...</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 dark:text-slate-300">
                  <th className="pb-2 pr-3">Material</th>
                  <th className="pb-2 pr-3">Density (kg/m^3)</th>
                  <th className="pb-2 pr-3">Strength</th>
                  <th className="pb-2 pr-3">Weight</th>
                  <th className="pb-2 pr-3">Cost</th>
                </tr>
              </thead>
              <tbody className="text-slate-700 dark:text-slate-200">
                {materials.map((material) => (
                  <tr key={material.id} className="border-t border-slate-200/80 dark:border-slate-700/80">
                    <td className="py-2 pr-3">{material.name}</td>
                    <td className="py-2 pr-3">{material.density}</td>
                    <td className="py-2 pr-3">{material.strengthScore}</td>
                    <td className="py-2 pr-3">{material.weightScore}</td>
                    <td className="py-2 pr-3">{material.costScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
