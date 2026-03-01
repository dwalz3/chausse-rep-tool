'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  monthlyRevenue: number[];
  monthLabels: string[];
}

function fmtMonth(ym: string) {
  const [y, m] = ym.split('-');
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function fmtDollar(v: number) {
  if (v >= 1000) return '$' + (v / 1000).toFixed(1) + 'k';
  return '$' + v.toFixed(0);
}

export default function AccountRevenueChart({ monthlyRevenue, monthLabels }: Props) {
  const data = monthLabels.map((ym, i) => ({
    month: fmtMonth(ym),
    revenue: monthlyRevenue[i] ?? 0,
  }));

  return (
    <div style={{ width: '100%', height: 200 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#30363D" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#7D8590' }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={fmtDollar} tick={{ fontSize: 11, fill: '#7D8590' }} axisLine={false} tickLine={false} width={52} />
          <Tooltip
            formatter={(v: number | undefined) => ['$' + (v ?? 0).toLocaleString(), 'Revenue']}
            contentStyle={{ borderRadius: 8, border: '1px solid #30363D', fontSize: 13 }}
          />
          <Bar dataKey="revenue" fill="#3FB950" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
