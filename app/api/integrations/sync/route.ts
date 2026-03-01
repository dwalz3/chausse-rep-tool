/**
 * POST /api/integrations/sync
 * Server-side proxy for Vinosmith report downloads.
 * VINOSMITH_UUID never reaches the browser — all requests go through here.
 *
 * Body: { key: RepSyncKey }
 * Returns: { ok: true, arrayBuffer: base64 } | { ok: false, error: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { RepSyncKey } from '@/types/integrations';

// Vinosmith report endpoint map.
// Each key maps to the report code used in the Vinosmith export URL.
// URL pattern: https://cloud.vinosmith.com/api/v1/reports/{reportCode}/export?uuid={UUID}&format=xlsx
const REPORT_MAP: Record<RepSyncKey, string> = {
  rc5:            'rc5',
  ra23:           'ra23',
  ra21:           'ra21',
  ra27:           'ra27',
  rb6:            'rb6',
  wineProperties: 'wine-properties',
  ra30:           'ra30',
  rc3:            'rc3',
  ra3:            'ra3',
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { key?: RepSyncKey };
    const { key } = body;

    if (!key || !(key in REPORT_MAP)) {
      return NextResponse.json({ ok: false, error: `Unknown sync key: ${key}` }, { status: 400 });
    }

    const uuid = process.env.VINOSMITH_UUID;
    if (!uuid) {
      return NextResponse.json(
        { ok: false, error: 'VINOSMITH_UUID not configured on server' },
        { status: 503 }
      );
    }

    const reportCode = REPORT_MAP[key];
    const url = `https://cloud.vinosmith.com/api/v1/reports/${reportCode}/export?uuid=${uuid}&format=xlsx`;

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    });

    if (!response.ok) {
      return NextResponse.json(
        { ok: false, error: `Vinosmith returned ${response.status}: ${response.statusText}` },
        { status: 502 }
      );
    }

    // Stream the XLSX bytes back as base64
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    return NextResponse.json({ ok: true, base64, filename: `${reportCode}.xlsx` });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
