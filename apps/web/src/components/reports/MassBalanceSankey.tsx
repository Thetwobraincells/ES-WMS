type SankeyItem = {
  vehicle: string;
  collected: number;
  dumped: number;
};

type MassBalanceSankeyProps = {
  data: SankeyItem[];
};

export function MassBalanceSankey({ data }: MassBalanceSankeyProps) {
  const totalCollected = data.reduce((sum, item) => sum + item.collected, 0);
  const totalDumped = data.reduce((sum, item) => sum + item.dumped, 0);

  return (
    <div className="rounded-2xl bg-gray-50 p-4">
      <div className="mb-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm font-semibold text-gray-700">
        <div>Collection Source</div>
        <div className="text-gray-400">Flow</div>
        <div className="text-right">Dumping Yard</div>
      </div>

      <div className="space-y-2">
        {data.map((item) => {
          const flowPercent = totalCollected > 0 ? (item.collected / totalCollected) * 100 : 0;
          return (
            <div key={item.vehicle} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-xs">
              <div className="truncate rounded-lg bg-white px-3 py-2 text-gray-700">{item.vehicle}</div>
              <div className="w-40">
                <div className="h-2 rounded-full bg-gray-200">
                  <div className="h-2 rounded-full bg-[#2E7D32]" style={{ width: `${Math.max(5, flowPercent)}%` }} />
                </div>
              </div>
              <div className="truncate rounded-lg bg-white px-3 py-2 text-right text-gray-700">
                {item.dumped} kg
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-gray-600">
        <div className="rounded-lg bg-white px-3 py-2">Total Collected: {totalCollected.toFixed(0)} kg</div>
        <div className="rounded-lg bg-white px-3 py-2 text-right">Total Dumped: {totalDumped.toFixed(0)} kg</div>
      </div>
    </div>
  );
}
