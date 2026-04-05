export function getSingleValue(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    const firstString = value.find((entry): entry is string => typeof entry === "string");
    return firstString;
  }

  return undefined;
}
