import { CheckIn, CheckInType, DayOff, DayStats, WeekStats, DepartureEstimate } from "@/types";
import { format, parseISO, startOfWeek, addMinutes, setHours, setMinutes, isMonday, isTuesday, isWednesday, isThursday, isFriday } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

const TZ = "Europe/Paris";
const DAILY_GOAL_MINUTES = 7 * 60; // 7h
const WEEKLY_GOAL_MINUTES = 35 * 60; // 35h

// Time ranges in local Paris time (hour, minute)
export const TIME_RANGES: Record<CheckInType, { start: [number, number]; end: [number, number] }> = {
    morning_in: { start: [7, 30], end: [9, 30] },
    lunch_out: { start: [11, 30], end: [14, 0] },
    lunch_in: { start: [11, 30], end: [14, 0] },
    evening_out: { start: [16, 0], end: [19, 0] }, // 16h on Friday, otherwise 16h30
};

export const CHECK_IN_LABELS: Record<CheckInType, string> = {
    morning_in: "Arrivée Matin",
    lunch_out: "Partir Déjeuner",
    lunch_in: "Retour Déjeuner",
    evening_out: "Départ Soir",
};

export const CHECK_IN_ICONS: Record<CheckInType, string> = {
    morning_in: "🌅",
    lunch_out: "🍽️",
    lunch_in: "⚡",
    evening_out: "🏠",
};

export const NEXT_CHECK_IN_ORDER: CheckInType[] = [
    "morning_in",
    "lunch_out",
    "lunch_in",
    "evening_out",
];

/**
 * Returns the next check-in type needed based on existing check-ins for today
 */
export function getNextCheckIn(todayCheckIns: CheckIn[]): CheckInType | null {
    const done = new Set(todayCheckIns.map((c) => c.type));
    for (const type of NEXT_CHECK_IN_ORDER) {
        if (!done.has(type)) return type;
    }
    return null; // All done
}

/**
 * Checks whether the current time is within the allowed range for a check-in type
 */
export function isWithinTimeRange(type: CheckInType, now: Date): boolean {
    const paris = toZonedTime(now, TZ);
    const range = TIME_RANGES[type];

    let startH = range.start[0];
    let startM = range.start[1];
    let endH = range.end[0];
    let endM = range.end[1];

    // Friday evening departure starts at 16h
    if (type === "evening_out" && isFriday(paris)) {
        startH = 16;
        startM = 0;
    } else if (type === "evening_out") {
        startH = 16;
        startM = 30;
    }

    const start = setMinutes(setHours(paris, startH), startM);
    const end = setMinutes(setHours(paris, endH), endM);

    return paris >= start && paris <= end;
}

/**
 * Returns the day key string (YYYY-MM-DD) for a timestamp in Paris timezone
 */
export function getDayKey(timestamp: string): string {
    const paris = toZonedTime(parseISO(timestamp), TZ);
    return format(paris, "yyyy-MM-dd");
}

/**
 * Groups check-ins by day and computes stats per day
 */
export function computeDayStats(checkIns: CheckIn[]): Record<string, DayStats> {
    const byDay: Record<string, CheckIn[]> = {};
    for (const ci of checkIns) {
        const day = getDayKey(ci.timestamp);
        if (!byDay[day]) byDay[day] = [];
        byDay[day].push(ci);
    }

    const result: Record<string, DayStats> = {};
    for (const [day, cis] of Object.entries(byDay)) {
        const byType = Object.fromEntries(cis.map((c) => [c.type, c.timestamp]));
        let workedMinutes = 0;

        if (byType.morning_in && byType.lunch_out) {
            const morning = parseISO(byType.morning_in).getTime();
            const lunchOut = parseISO(byType.lunch_out).getTime();
            workedMinutes += (lunchOut - morning) / 60000;
        }
        if (byType.lunch_in && byType.evening_out) {
            const lunchIn = parseISO(byType.lunch_in).getTime();
            const eveningOut = parseISO(byType.evening_out).getTime();
            workedMinutes += (eveningOut - lunchIn) / 60000;
        }

        const lunchBreakMinutes =
            byType.lunch_out && byType.lunch_in
                ? Math.round((parseISO(byType.lunch_in).getTime() - parseISO(byType.lunch_out).getTime()) / 60000)
                : undefined;

        result[day] = {
            morning_in: byType.morning_in,
            lunch_out: byType.lunch_out,
            lunch_in: byType.lunch_in,
            evening_out: byType.evening_out,
            workedMinutes: Math.max(0, workedMinutes),
            isComplete: !!(byType.morning_in && byType.lunch_out && byType.lunch_in && byType.evening_out),
            lunchBreakMinutes,
        };
    }

    return result;
}

/**
 * Computes a week's worth of stats (Mon–Fri), credit/debit
 * dayOffs : jours marqués comme non travaillés — exclus du crédit ET du total attendu
 */
export function computeWeekStats(checkIns: CheckIn[], weekStart: Date, dayOffs: DayOff[] = []): WeekStats {
    const days = computeDayStats(checkIns);
    const dayOffDates = new Set(dayOffs.map((d) => d.date));

    // Les jours off n'entrent ni dans le total travaillé ni dans le crédit
    const totalWorkedMinutes = Object.entries(days)
        .filter(([day]) => !dayOffDates.has(day))
        .reduce((sum, [, d]) => sum + d.workedMinutes, 0);

    // Le crédit ne se calcule que sur les jours terminés ET non-off
    const completedDays = Object.entries(days)
        .filter(([day, d]) => d.isComplete && !dayOffDates.has(day))
        .map(([, d]) => d);
    const creditMinutes = completedDays.reduce(
        (sum, d) => sum + (d.workedMinutes - DAILY_GOAL_MINUTES),
        0
    );

    // Semaine de 5 jours moins les jours off
    const workingDaysCount = Math.max(0, 5 - dayOffDates.size);
    const expectedMinutes = workingDaysCount * DAILY_GOAL_MINUTES;

    return {
        totalWorkedMinutes,
        expectedMinutes,
        creditMinutes,
        days,
        dayOffDates,
    };
}

/**
 * Calculates departure time estimates after 3rd check-in (lunch_in)
 */
export function computeDepartureEstimate(
    todayStats: DayStats,
    weekCreditMinutes: number,
    now: Date
): DepartureEstimate {
    if (!todayStats.morning_in || !todayStats.lunch_out || !todayStats.lunch_in) {
        return { forDailyGoal: null, withWeekCredit: null };
    }

    const morningIn = parseISO(todayStats.morning_in).getTime();
    const lunchOut = parseISO(todayStats.lunch_out).getTime();
    const lunchIn = parseISO(todayStats.lunch_in).getTime();

    const morningWorked = (lunchOut - morningIn) / 60000;
    const remainingForGoal = DAILY_GOAL_MINUTES - morningWorked;

    const forDailyGoal = new Date(lunchIn + remainingForGoal * 60000);

    // If there's a credit from previous days, subtract it from today's required time
    // But credit resets weekly - only use current week's credit
    const remainingWithCredit = remainingForGoal - weekCreditMinutes;
    let withWeekCreditTime = new Date(lunchIn + remainingWithCredit * 60000);

    const parisNow = toZonedTime(now, TZ);
    const isFridayToday = isFriday(parisNow);
    const minH = isFridayToday ? 16 : 16;
    const minM = isFridayToday ? 0 : 30;
    const minDepartureTime = setMinutes(setHours(parisNow, minH), minM);

    let isCapped = false;
    if (withWeekCreditTime < minDepartureTime) {
        withWeekCreditTime = minDepartureTime;
        isCapped = true;
    }

    return {
        forDailyGoal: format(toZonedTime(forDailyGoal, TZ), "HH:mm"),
        withWeekCredit: format(toZonedTime(withWeekCreditTime, TZ), "HH:mm"),
        isCapped,
    };
}

/**
 * Formats minutes as "Xh YYmin"
 */
export function formatDuration(minutes: number): string {
    const abs = Math.abs(minutes);
    const h = Math.floor(abs / 60);
    const m = Math.round(abs % 60);
    
    let signStr = "";
    if (minutes < 0) signStr = "-";
    else if (minutes > 0) signStr = "+";

    if (h === 0) return `${signStr}${m}min`;
    return `${signStr}${h}h${m > 0 ? String(m).padStart(2, "0") : ""}`;
}

/**
 * Returns the Monday of the current week (Paris TZ)
 */
export function getCurrentWeekMonday(now: Date): Date {
    const paris = toZonedTime(now, TZ);
    return startOfWeek(paris, { weekStartsOn: 1 });
}

/**
 * Computes lost hours for past weeks.
 * A lost hour is when a week ends with positive credit.
 */
export function computeLostHours(
    pastCheckIns: CheckIn[],
    pastDayOffs: DayOff[],
    currentWeekStart: Date
): { lastWeekLost: number; totalLost: number } {
    let totalLost = 0;
    let lastWeekLost = 0;

    // Group check-ins and dayOffs by week start
    const checkInsByWeek: Record<string, CheckIn[]> = {};
    const dayOffsByWeek: Record<string, DayOff[]> = {};

    for (const c of pastCheckIns) {
        const d = parseISO(c.timestamp);
        const ws = startOfWeek(toZonedTime(d, TZ), { weekStartsOn: 1 }).toISOString();
        if (!checkInsByWeek[ws]) checkInsByWeek[ws] = [];
        checkInsByWeek[ws].push(c);
    }

    for (const d of pastDayOffs) {
        const dt = parseISO(`${d.date}T12:00:00`);
        const ws = startOfWeek(toZonedTime(dt, TZ), { weekStartsOn: 1 }).toISOString();
        if (!dayOffsByWeek[ws]) dayOffsByWeek[ws] = [];
        dayOffsByWeek[ws].push(d);
    }

    const currentWeekStartStr = startOfWeek(toZonedTime(currentWeekStart, TZ), { weekStartsOn: 1 }).toISOString();
    const lastWeekStartStr = startOfWeek(toZonedTime(new Date(currentWeekStart.getTime() - 7 * 24 * 3600 * 1000), TZ), { weekStartsOn: 1 }).toISOString();
    const allWeekKeys = new Set([...Object.keys(checkInsByWeek), ...Object.keys(dayOffsByWeek)]);

    for (const wsStr of allWeekKeys) {
        if (wsStr >= currentWeekStartStr) continue; // On ignore la semaine actuelle et futures
        
        const weekDate = parseISO(wsStr);
        const stats = computeWeekStats(checkInsByWeek[wsStr] || [], weekDate, dayOffsByWeek[wsStr] || []);
        if (stats.creditMinutes > 0) {
            totalLost += stats.creditMinutes;
            if (wsStr === lastWeekStartStr) {
                lastWeekLost = stats.creditMinutes;
            }
        }
    }

    return { lastWeekLost, totalLost };
}
