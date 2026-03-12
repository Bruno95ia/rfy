export type RecordType = 'opportunity' | 'activity';

export type DedupeResult<T> = {
  unique: T[];
  duplicateCount: number;
};

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

export function buildRecordDedupeKey(
  orgId: string,
  externalId: string,
  recordType: RecordType
): string {
  return `${normalizeKey(orgId)}::${recordType}::${normalizeKey(externalId)}`;
}

export function dedupeByExternalId<T>(
  orgId: string,
  recordType: RecordType,
  records: T[],
  pickExternalId: (record: T) => string | null | undefined
): DedupeResult<T> {
  const seen = new Set<string>();
  const unique: T[] = [];
  let duplicateCount = 0;

  for (const record of records) {
    const externalId = pickExternalId(record);
    if (!externalId || externalId.trim() === '') {
      unique.push(record);
      continue;
    }
    const dedupeKey = buildRecordDedupeKey(orgId, externalId, recordType);
    if (seen.has(dedupeKey)) {
      duplicateCount += 1;
      continue;
    }
    seen.add(dedupeKey);
    unique.push(record);
  }

  return { unique, duplicateCount };
}
