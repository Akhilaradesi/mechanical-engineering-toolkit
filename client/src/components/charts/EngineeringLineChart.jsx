import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
} from "chart.js";
import { Line } from "react-chartjs-2";
import { useTheme } from "../../context/ThemeContext";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

export function EngineeringLineChart({ labels, values, label, unit }) {
  const { isDark } = useTheme();
  const axisColor = isDark ? "rgba(226, 232, 240, 0.8)" : "rgba(30, 41, 59, 0.8)";
  const gridColor = isDark ? "rgba(148, 163, 184, 0.2)" : "rgba(51, 65, 85, 0.12)";

  const data = {
    labels,
    datasets: [
      {
        label,
        data: values,
        borderColor: "rgba(34, 211, 238, 1)",
        backgroundColor: "rgba(34, 211, 238, 0.2)",
        fill: true,
        tension: 0.25,
        borderWidth: 2,
        pointRadius: 2
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: axisColor }
      },
      tooltip: {
        callbacks: {
          label: (context) => `${context.raw} ${unit}`.trim()
        }
      }
    },
    scales: {
      x: {
        ticks: { color: axisColor },
        grid: { color: gridColor }
      },
      y: {
        ticks: { color: axisColor },
        grid: { color: gridColor }
      }
    }
  };

  if (!labels.length || !values.length) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-300 text-sm text-slate-500 dark:border-slate-600 dark:text-slate-400">
        Enter valid inputs to preview chart output.
      </div>
    );
  }

  return (
    <div className="h-64">
      <Line data={data} options={options} />
    </div>
  );
}
