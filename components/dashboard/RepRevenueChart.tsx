'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Rc5Data } from '@/types';
import { RepIdentity } from '@/types';

interface Props {
  rc5Data: Rc5Data;
  rep: RepIdentity;
}

function fmtMonth(ym: string) {
  const [y, m] = ym.split('-');
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function fmtDollar(v: number) {
  if (v >= 1000) return '$' + (v / 1000).toFixed(1) + 'k';
  return '$' + v.toFixed(0);
}

export default function RepRevenueChart({ rc5Data, rep }: Props) {
  const repRows = rc5Data.rows.filter((r) => r.primaryRep === rep);

  // Sum monthly revenue across all accounts for this rep
  const data = rc5Data.monthLabels.map((ym, idx) => ({
    month: fmtMonth(ym),
    revenue: repRows.reduce((s, r) => s + (r.monthlyRevenue[idx] ?? 0), 0),
  }));

  return (
    <div style={{ width: '100%', height: 200 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="repGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2D5A3D" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#2D5A3D" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E1DC" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={fmtDollar} tick={{ fontSize: 11, fill: '#a8a29e' }} axisLine={false} tickLine={false} width={52} />
          <Tooltip
            formatter={(v: number | undefined) => ['$' + (v ?? 0).toLocaleString(), 'Revenue']}
            contentStyle={{ borderRadius: 8, border: '1px solid #E5E1DC', fontSize: 13 }}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#2D5A3D"
            strokeWidth={2}
            fill="url(#repGrad)"
            dot={false}
            activeDot={{ r: 4, fill: '#2D5A3D' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
