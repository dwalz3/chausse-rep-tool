/**
 * pdfTableExtractor.ts
 * Extracts tabular text from a PDF ArrayBuffer using pdfjs-dist.
 * Groups text items into rows by Y position (tolerance 4px), sorts by X.
 * Returns string[][] (same shape as XLSX.utils.sheet_to_json with {header:1}).
 */

// Use legacy build to avoid worker bundling issues in Next.js
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pdfjsLib: any = null;

async function getPdfjs() {
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist/legacy/build/pdf');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
  }
  return pdfjsLib;
}

interface TextItem {
  str: string;
  transform: number[]; // [a,b,c,d,x,y]
}

export async function extractTableFromPdf(buffer: ArrayBuffer): Promise<string[][]> {
  const lib = await getPdfjs();
  const pdf = await lib.getDocument({ data: new Uint8Array(buffer) }).promise;

  const allRows: string[][] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    // Group items by Y (rounded to nearest 4px to handle sub-pixel jitter)
    const byY = new Map<number, { x: number; text: string }[]>();
    for (const item of content.items as TextItem[]) {
      if (!item.str?.trim()) continue;
      const y = Math.round(item.transform[5] / 4) * 4;
      const x = item.transform[4];
      if (!byY.has(y)) byY.set(y, []);
      byY.get(y)!.push({ x, text: item.str.trim() });
    }

    // Sort rows top-to-bottom (PDF Y is bottom-up, so descending Y = top-first)
    const sortedYs = Array.from(byY.keys()).sort((a, b) => b - a);

    for (const y of sortedYs) {
      const items = byY.get(y)!.sort((a, b) => a.x - b.x);
      const row = items.map((i) => i.text);
      if (row.some((c) => c.length > 0)) {
        allRows.push(row);
      }
    }
  }

  return allRows;
}
