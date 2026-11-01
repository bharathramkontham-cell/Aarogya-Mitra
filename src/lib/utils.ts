export function activeDaysBetween(startDate: string, endDate: string): Record<string, unknown>[] {
  const data: Record<string, unknown>[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  let currentDate = start;
  while (currentDate <= end) {
    const ts = currentDate.toISOString();
    data.push({ day: ts });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return data;
}

export function datesBetween(startDate: string, endDate: string): Record<string, string>[] {
  const data: Record<string, string>[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  let currentDate = start;
  while (currentDate <= end) {
    const ts = currentDate.toISOString();
    data.push({ date: ts });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return data;
}
