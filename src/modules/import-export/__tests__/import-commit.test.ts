import { describe, it, expect } from 'vitest';
import { partitionImportRows, buildImportErrorReportCsv, type ImportErrorRowData } from '../import-commit';
import type { ImportError } from '../excel.service';

// Sheet rows 2..11 = 10 data rows; row 6 (the 5th data row) is invalid.
const ROW_NUMBERS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const INVALID_ROW = 6;

describe('partitionImportRows — strict vs force', () => {
  it('strict mode (force=false) blocks the entire commit when any row is invalid', () => {
    const res = partitionImportRows({
      rowNumbers: ROW_NUMBERS,
      errorRowNumbers: [INVALID_ROW],
      skipRowNumbers: [],
      force: false,
    });
    expect(res.blocked).toBe(true);
    expect(res.commitRowNumbers).toHaveLength(0); // 0 rows committed
    expect(res.skippedInvalid).toEqual([INVALID_ROW]);
  });

  it('force mode commits the 9 valid rows and skips the invalid one', () => {
    const res = partitionImportRows({
      rowNumbers: ROW_NUMBERS,
      errorRowNumbers: [INVALID_ROW],
      skipRowNumbers: [],
      force: true,
    });
    expect(res.blocked).toBe(false);
    expect(res.commitRowNumbers).toHaveLength(9);
    expect(res.commitRowNumbers).not.toContain(INVALID_ROW);
    expect(res.skippedInvalid).toEqual([INVALID_ROW]);
  });

  it('commits all rows when there are no errors (strict)', () => {
    const res = partitionImportRows({
      rowNumbers: ROW_NUMBERS,
      errorRowNumbers: [],
      skipRowNumbers: [],
      force: false,
    });
    expect(res.blocked).toBe(false);
    expect(res.commitRowNumbers).toEqual(ROW_NUMBERS);
  });

  it('never commits user-skipped rows, even in force mode', () => {
    const res = partitionImportRows({
      rowNumbers: ROW_NUMBERS,
      errorRowNumbers: [INVALID_ROW],
      skipRowNumbers: [3],
      force: true,
    });
    expect(res.commitRowNumbers).not.toContain(3);
    expect(res.commitRowNumbers).not.toContain(INVALID_ROW);
    expect(res.commitRowNumbers).toHaveLength(8);
    expect(res.skippedByUser).toEqual([3]);
  });
});

describe('buildImportErrorReportCsv', () => {
  const rowData = new Map<number, ImportErrorRowData>(
    Array.from({ length: 10 }, (_, i) => [i + 2, { name: `Item ${i + 1}`, sku: `SKU-${i + 1}`, netRate: 100 }] as const),
  );

  it('includes the invalid row with its original data and the error message', () => {
    const errors: ImportError[] = [
      { row: INVALID_ROW, field: 'Net Rate', message: 'must be positive' },
    ];
    const csv = buildImportErrorReportCsv(rowData, errors);
    const lines = csv.split('\r\n');
    expect(lines[0]).toContain('Errors');
    // row 6 -> "Item 5" / "SKU-5"
    const rowLine = lines.find((l) => l.startsWith('6,'));
    expect(rowLine).toBeDefined();
    expect(rowLine).toContain('Item 5');
    expect(rowLine).toContain('SKU-5');
    expect(rowLine).toContain('Net Rate: must be positive');
  });

  it('still lists a row with no captured data (e.g. parse failure)', () => {
    const csv = buildImportErrorReportCsv(new Map(), [{ row: 7, message: 'unreadable row' }]);
    const rowLine = csv.split('\r\n').find((l) => l.startsWith('7,'));
    expect(rowLine).toBeDefined();
    expect(rowLine).toContain('unreadable row');
  });

  it('escapes commas/quotes in cell values', () => {
    const csv = buildImportErrorReportCsv(
      new Map([[2, { name: 'Rice, Basmati' }]]),
      [{ row: 2, message: 'bad' }],
    );
    expect(csv).toContain('"Rice, Basmati"');
  });

  it('one line per errored row, sorted by row number', () => {
    const errors: ImportError[] = [
      { row: 9, message: 'b' },
      { row: 4, message: 'a' },
    ];
    const csv = buildImportErrorReportCsv(rowData, errors);
    const dataLines = csv.split('\r\n').slice(1);
    expect(dataLines).toHaveLength(2);
    expect(dataLines[0].startsWith('4,')).toBe(true);
    expect(dataLines[1].startsWith('9,')).toBe(true);
  });
});
