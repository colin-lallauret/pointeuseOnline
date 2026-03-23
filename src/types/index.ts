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

export interface DayStats {
    morning_in?: string;
    lunch_out?: string;
    lunch_in?: string;
    evening_out?: string;
    workedMinutes: number;
    isComplete: boolean;
}

export interface WeekStats {
    totalWorkedMinutes: number;
    creditMinutes: number; // positive = credit, negative = debit
    days: Record<string, DayStats>;
}

export interface DepartureEstimate {
    forDailyGoal: string | null;    // To reach 7h today
    withWeekCredit: string | null;  // To use weekly credit
}
