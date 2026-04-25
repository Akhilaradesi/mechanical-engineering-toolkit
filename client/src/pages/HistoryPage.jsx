import { useEffect, useState } from "react";
import { apiClient } from "../api/apiClient";
import { EngineeringLineChart } from "../components/charts/EngineeringLineChart";
import { PageHeader } from "../components/common/PageHeader";
import { ResultPanel } from "../components/common/ResultPanel";

const buildHistoryTrend = (historyItems) => {
  const map = new Map();

  historyItems.forEach((item) => {
    const dateKey = new Date(item.timestamp).toLocaleDateString();
    map.set(dateKey, (map.get(dateKey) || 0) + 1);
  });

  return {
    labels: Array.from(map.keys()),
    values: Array.from(map.values())
  };
};

export function HistoryPage() {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState("");

  const loadHistory = async () => {
    setIsLoading(true);
    setFeedback("");

    try {
      const payload = await apiClient.getHistory();
      setHistory(payload.history);
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const trend = buildHistoryTrend(history);

  return (
    <div>
      <PageHeader
        title="Calculation History"
        description="Review previously saved outputs from all calculators and tools. History is stored in a server-side JSON file."
      />

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-600 dark:text-slate-300">{history.length} saved records</p>
        <button
          type="button"
          onClick={loadHistory}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-700"
        >
          Refresh
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr,1fr]">
        <ResultPanel title="Saved Activity Trend" subtitle="Number of saved records by day.">
          <EngineeringLineChart labels={trend.labels} values={trend.values} label="Saved Records" unit="records" />
        </ResultPanel>

        <ResultPanel title="Storage Details" subtitle="Persistence design for portfolio review.">
          <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <li>Backend: Node.js + Express REST APIs</li>
            <li>Store: `server/storage/history.json`</li>
            <li>Limit: latest 500 records retained</li>
            <li>Save endpoint: `POST /save`</li>
            <li>Read endpoint: `GET /history`</li>
          </ul>
        </ResultPanel>
      </div>

      <section className="mt-4 space-y-3">
        {isLoading ? <p className="app-surface text-sm text-slate-500 dark:text-slate-400">Loading history...</p> : null}
        {feedback ? <p className="app-surface text-sm text-rose-600 dark:text-rose-400">{feedback}</p> : null}
        {!isLoading && !feedback && history.length === 0 ? (
          <p className="app-surface text-sm text-slate-500 dark:text-slate-400">No saved calculations yet.</p>
        ) : null}

        {history.map((item) => (
          <article key={item.id} className="app-surface">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{item.tool}</h2>
              <span className="mono text-xs text-slate-500 dark:text-slate-400">
                {new Date(item.timestamp).toLocaleString()}
              </span>
            </div>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <div className="rounded-lg bg-slate-100 p-3 dark:bg-slate-800/70">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Inputs</p>
                <pre className="mono overflow-x-auto text-xs text-slate-700 dark:text-slate-200">
                  {JSON.stringify(item.inputs, null, 2)}
                </pre>
              </div>
              <div className="rounded-lg bg-slate-100 p-3 dark:bg-slate-800/70">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Result</p>
                <pre className="mono overflow-x-auto text-xs text-slate-700 dark:text-slate-200">
                  {JSON.stringify(item.result, null, 2)}
                </pre>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
