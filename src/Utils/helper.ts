import xlsx from "xlsx";

export function parseDate(value: any): Date | undefined {
  if (!value) return undefined;

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "number") {
    return xlsx.SSF
      ? new Date(Math.round((value - 25569) * 86400 * 1000))
      : undefined;
  }

  if (typeof value === "string") {
    const parts = value.includes("-") ? value.split("-") : value.split("/");
    if (parts.length === 3) {
      return new Date(parts.reverse().join("-")); 
    }
    return new Date(value);
  }

  return undefined;
}
