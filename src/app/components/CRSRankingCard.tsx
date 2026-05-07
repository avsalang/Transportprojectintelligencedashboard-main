import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { estimateCategoryAxisWidth, WrappedCategoryTick } from './ChartTicks';
import { crsFmt } from '../data/crsData';
import type { CRSMeasure } from '../utils/crsAggregations';

type RankingRow = {
  label: string;
  commitment: number;
  disbursement: number;
  commitment_defl: number;
  disbursement_defl: number;
  count: number;
};

export function CRSRankingCard({
  title,
  subtitle,
  data,
  measure,
  color,
  maxChars = 22,
  footnote,
}: {
  title: string;
  subtitle: string;
  data: RankingRow[];
  measure: CRSMeasure;
  color: string;
  maxChars?: number;
  footnote?: string;
}) {
  const axisWidth = estimateCategoryAxisWidth(data.map((item) => item.label), {
    maxChars,
    minWidth: 220,
    maxWidth: 340,
  });
  const chartHeight = Math.max(320, data.length * 34 + 56);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <p className="text-slate-900 text-base font-semibold mb-1 text-wrap">{title}</p>
      <p className="text-slate-500 text-sm mb-4 text-wrap">{subtitle}</p>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }} barCategoryGap={3}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 12, fill: '#64748B' }} tickLine={false} axisLine={false} tickFormatter={(value: number) => crsFmt.usdM(value)} />
          <YAxis
            type="category"
            dataKey="label"
            tick={<WrappedCategoryTick maxChars={maxChars} fontSize={12} fill="#334155" lineHeight={14} />}
            tickLine={false}
            axisLine={false}
            width={axisWidth}
            interval={0}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }}
            formatter={(value: number) => [crsFmt.usdM(value), measure.includes('commitment') ? 'Commitments' : 'Disbursements']}
          />
          <Bar dataKey={measure} radius={[0, 3, 3, 0]} maxBarSize={16}>
            {data.map((row) => (
              <Cell key={row.label} fill={color} fillOpacity={0.86} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {footnote ? <p className="mt-3 text-[11px] text-slate-400">{footnote}</p> : null}
    </div>
  );
}
