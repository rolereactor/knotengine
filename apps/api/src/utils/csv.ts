export function escapeCsvField(val: string): string {
  return val.includes(",") || val.includes('"') || val.includes("\n")
    ? `"${val.replace(/"/g, '""')}"`
    : val;
}

export function generateCsvRow(fields: string[]): string {
  return fields.map(escapeCsvField).join(",");
}
