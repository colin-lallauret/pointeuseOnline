export type CheckInType = "morning_in" | "lunch_out" | "lunch_in" | "evening_out";

export interface CheckIn {
    id: string;
    user_id: string;
    type: CheckInType;
    timestamp: string;
    is_manual: boolean;
    created_at: string;
    updated_at: string;
}

export interface DayOff {
    id: string;
    user_id: string;
    date: string;   // YYYY-MM-DD
    reason: string | null;
    created_at: string;
}

export interface DayStats {
    morning_in?: string;
    lunch_out?: string;
    lunch_in?: string;
    evening_out?: string;
    workedMinutes: number;
    isComplete: boolean;
    lunchBreakMinutes?: number; // durée de pause midi (lunch_out → lunch_in)
}

export interface WeekStats {
    totalWorkedMinutes: number;
    expectedMinutes: number; // objectif de la semaine (ex: 35h - jours off)
    creditMinutes: number; // positive = credit, negative = debit
    days: Record<string, DayStats>;
    dayOffDates: Set<string>; // jours marqués comme non travaillés (YYYY-MM-DD)
}

export interface DepartureEstimate {
    forDailyGoal: string | null;    // To reach 7h today
    withWeekCredit: string | null;  // To use weekly credit
    isCapped?: boolean;             // True if withWeekCredit was limited by minimum departure time (16:30 or 16:00)
}

