type Item = {
  vehicle: string;
  collected: number;
  dumped: number;
};

type MassBalanceBarsProps = {
  data: Item[];
};

export function MassBalanceBars({ data }: MassBalanceBarsProps) {
  const maxValue = Math.max(1, ...data.flatMap((item) => [item.collected, item.dumped]));

  return (
    <div className="space-y-3">
      {data.map((item) => {
        const collectedWidth = `${Math.max(4, Math.round((item.collected / maxValue) * 100))}%`;
        const dumpedWidth = `${Math.max(4, Math.round((item.dumped / maxValue) * 100))}%`;

        return (
          <div key={item.vehicle} className="rounded-xl bg-gray-50 p-3">
            <p className="mb-2 text-xs font-semibold text-gray-700">{item.vehicle}</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-20 text-xs text-gray-600">Collected</span>
                <div className="h-2 flex-1 rounded-full bg-gray-200">
                  <div className="h-2 rounded-full bg-[#2E7D32]" style={{ width: collectedWidth }} />
                </div>
                <span className="w-16 text-right text-xs text-gray-700">{item.collected} kg</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-20 text-xs text-gray-600">Dumped</span>
                <div className="h-2 flex-1 rounded-full bg-gray-200">
                  <div className="h-2 rounded-full bg-[#F59E0B]" style={{ width: dumpedWidth }} />
                </div>
                <span className="w-16 text-right text-xs text-gray-700">{item.dumped} kg</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
