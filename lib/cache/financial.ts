import { invalidateCacheByPrefix } from "@/lib/cache";

type Period = {
  month: number;
  year: number;
};

function uniquePeriods(periods: Period[]) {
  return [...new Map(periods.map((period) => [`${period.year}:${period.month}`, period])).values()];
}

export function getFinancialCachePrefixes(periods: Period[]) {
  const prefixes = new Set<string>();

  for (const period of uniquePeriods(periods)) {
    const suffix = `${period.year}:${period.month}`;
    prefixes.add(`reports:${suffix}`);
    prefixes.add(`dashboard:${suffix}`);
    prefixes.add(`boxes:${suffix}`);
    prefixes.add(`sales:${suffix}`);
    prefixes.add(`expenses:${suffix}`);
    prefixes.add(`transfers:${suffix}`);
  }

  return [...prefixes];
}

export async function invalidateFinancialPeriodCaches(periods: Period[]) {
  if (periods.length === 0) {
    return;
  }

  await invalidateCacheByPrefix(getFinancialCachePrefixes(periods));
}

export async function invalidateSettingsCaches() {
  await invalidateCacheByPrefix(["settings:categories", "settings:active-month"]);
}
