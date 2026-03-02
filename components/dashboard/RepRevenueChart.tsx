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
    <div className="w-full h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="repGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2} />
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={fmtDollar} tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} width={48} />
          <Tooltip
            formatter={(v: number | undefined) => ['$' + (v ?? 0).toLocaleString(), 'Revenue']}
            contentStyle={{
              backgroundColor: 'var(--surface)',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
              fontSize: '13px',
              color: 'var(--text)'
            }}
            itemStyle={{ color: 'var(--text)', fontWeight: 600 }}
            cursor={{ stroke: 'var(--border)', strokeWidth: 1, strokeDasharray: '4 4' }}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="var(--primary)"
            strokeWidth={2}
            fill="url(#repGrad)"
            dot={false}
            activeDot={{ r: 4, fill: 'var(--primary)', stroke: 'var(--surface)', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
