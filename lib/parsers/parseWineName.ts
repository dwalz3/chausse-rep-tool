/**
 * parseWineName — Parse Vinosmith wine name format
 * Input:  'Producer, Wine Name, Vintage - CaseSize/BottleSize'
 * Example: 'Domaine Leflaive, Puligny-Montrachet, 2022 - 12/750ml'
 */

export interface ParsedWineName {
  producer: string;
  wineName: string;
  vintage: string;
  caseSize: string;
  bottleSize: string;
}

export function parseWineName(raw: string): ParsedWineName {
  if (!raw || typeof raw !== 'string') {
    return { producer: '', wineName: raw ?? '', vintage: '', caseSize: '', bottleSize: '' };
  }

  const trimmed = raw.trim();

  // Split on ' - ' to separate the size portion
  const dashIdx = trimmed.lastIndexOf(' - ');
  let sizePart = '';
  let namePart = trimmed;

  if (dashIdx !== -1) {
    sizePart = trimmed.slice(dashIdx + 3).trim();
    namePart = trimmed.slice(0, dashIdx).trim();
  }

  // Parse size: '12/750ml' or '6/1.5L' etc.
  let caseSize = '';
  let bottleSize = '';
  if (sizePart) {
    const sizeMatch = sizePart.match(/^(\d+)\s*\/\s*(.+)$/);
    if (sizeMatch) {
      caseSize = sizeMatch[1];
      bottleSize = sizeMatch[2].trim();
    } else {
      bottleSize = sizePart;
    }
  }

  // Split name part on commas: 'Producer, Wine Name, Vintage'
  const parts = namePart.split(',').map((s) => s.trim());

  let producer = '';
  let wineName = '';
  let vintage = '';

  if (parts.length >= 3) {
    producer = parts[0];
    // Last part might be vintage (4-digit year or NV/MV)
    const lastPart = parts[parts.length - 1];
    if (/^(NV|MV|\d{4})$/i.test(lastPart)) {
      vintage = lastPart;
      wineName = parts.slice(1, -1).join(', ');
    } else {
      wineName = parts.slice(1).join(', ');
    }
  } else if (parts.length === 2) {
    producer = parts[0];
    wineName = parts[1];
  } else {
    wineName = parts[0] ?? namePart;
  }

  return { producer, wineName, vintage, caseSize, bottleSize };
}
