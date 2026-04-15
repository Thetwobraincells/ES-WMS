type Item = {
  vehicle: string;
  discrepancyPercent: number;
};

type DiscrepancyChartProps = {
  data: Item[];
};

export function DiscrepancyChart({ data }: DiscrepancyChartProps) {
  return (
    <div className="space-y-2">
      {data.map((item) => (
        <div key={item.vehicle} className="rounded-xl bg-gray-50 p-3">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-semibold text-gray-700">{item.vehicle}</span>
            <span className={item.discrepancyPercent > 15 ? "font-semibold text-red-600" : "text-gray-700"}>
              {item.discrepancyPercent.toFixed(1)}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-gray-200">
            <div
              className={`h-2 rounded-full ${item.discrepancyPercent > 15 ? "bg-red-500" : "bg-[#2E7D32]"}`}
              style={{ width: `${Math.min(100, Math.max(3, item.discrepancyPercent))}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
