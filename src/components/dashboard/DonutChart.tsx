import React from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';

type Slice = { name: string; value: number; color: string };

type Props = {
  data: Slice[];
  centerLabelTop: string;
  centerLabelBottom: string;
};

const DonutChart = ({ data, centerLabelTop, centerLabelBottom }: Props) => {
  const top =
    typeof centerLabelTop === 'string' && centerLabelTop.length > 14 ? `${centerLabelTop.slice(0, 14)}…` : centerLabelTop;
  const topFont = typeof top === 'string' && top.length > 10 ? 9.5 : 10;
  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="63%"
            outerRadius="78%"
            startAngle={90}
            endAngle={-270}
            stroke="rgba(255,255,255,0.92)"
            strokeWidth={3}
            paddingAngle={3}
            cornerRadius={12}
            isAnimationActive
            animationDuration={900}
            animationEasing="ease-out"
          >
            {data.map((s) => (
              <Cell key={s.name} fill={s.color} />
            ))}
          </Pie>
          {/* Center labels */}
          <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" className="fill-slate-500" fontSize={topFont} fontWeight="700">
            {top}
          </text>
          <text
            x="50%"
            y="59%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-slate-900"
            fontSize="12.5"
            fontWeight="700"
          >
            {centerLabelBottom}
          </text>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DonutChart;
