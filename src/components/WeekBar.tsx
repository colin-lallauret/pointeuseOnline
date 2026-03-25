"use client";

import { WeekStats } from "@/types";
import { formatDuration } from "@/lib/timeUtils";
import { Card } from "@/components/ui/card";
import { format, startOfWeek, addDays } from "date-fns";
import { fr } from "date-fns/locale";

interface WeekBarProps {
    weekStats: WeekStats;
    weekRef: Date;         // Date de référence pour la semaine affichée
    isCurrentWeek: boolean;
}

const DAYS_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven"];
const DAILY_GOAL = 7 * 60;

export function WeekBar({ weekStats, weekRef, isCurrentWeek }: WeekBarProps) {
    const expected = weekStats.expectedMinutes || (35 * 60);
    const progressPercent = expected > 0 ? Math.min(100, (weekStats.totalWorkedMinutes / expected) * 100) : 100;

    // Indice du jour courant dans la semaine (0=Lun … 4=Ven), ou -1 si autre semaine
    const todayIndex = isCurrentWeek ? Math.min(4, Math.max(0, new Date().getDay() - 1)) : -1;

    // Construire les clés de chaque jour Lun→Ven de la semaine affichée
    const monday = startOfWeek(weekRef, { weekStartsOn: 1 });
    const dayKeys = Array.from({ length: 5 }, (_, i) =>
        format(addDays(monday, i), "yyyy-MM-dd")
    );

    return (
        <Card className="bg-slate-900 border-slate-800 rounded-3xl p-4">
            <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Semaine</p>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${weekStats.creditMinutes >= 0
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-red-500/10 text-red-400"
                    }`}>
                    {formatDuration(weekStats.creditMinutes)}
                </span>
            </div>

            {/* Barre de progression */}
            <div className="relative h-2.5 bg-slate-800 rounded-full mb-4 overflow-hidden">
                <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-500 transition-all duration-700"
                    style={{ width: `${progressPercent}%` }}
                />
            </div>

            {/* Barres par jour */}
            <div className="flex gap-2">
                {DAYS_SHORT.map((day, i) => {
                    const dayKey = dayKeys[i];
                    const dayData = weekStats.days[dayKey];
                    const workedMin = dayData?.workedMinutes || 0;
                    const percent = Math.min(100, (workedMin / DAILY_GOAL) * 100);
                    const isToday = i === todayIndex;
                    const isPast = isCurrentWeek ? i < todayIndex : true;
                    const isFuture = isCurrentWeek ? i > todayIndex : false;
                    const isOff = weekStats.dayOffDates?.has(dayKey);

                    return (
                        <div key={day} className={`flex-1 flex flex-col items-center gap-1.5 ${isOff ? "opacity-50 grayscale" : ""}`}>
                            {/* Mini barre verticale */}
                            <div className="w-full h-8 bg-slate-800 rounded-xl overflow-hidden flex items-end relative">
                                {isOff && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                       <span className="text-[10px] font-bold text-slate-700/80 transform rotate-[-90deg]">OFF</span>
                                    </div>
                                )}
                                <div
                                    className={`w-full rounded-xl transition-all duration-500 ${isOff
                                            ? "bg-slate-800"
                                            : dayData?.isComplete
                                                ? "bg-emerald-500"
                                                : isToday && workedMin > 0
                                                    ? "bg-violet-500"
                                                    : isPast && workedMin > 0
                                                        ? "bg-slate-500"
                                                        : isPast && !workedMin
                                                            ? "bg-red-900/50"
                                                            : "bg-slate-700"
                                        }`}
                                    style={{ height: isOff ? '100%' : `${Math.max(percent > 0 ? 8 : 0, percent)}%` }}
                                />
                            </div>
                            <span className={`text-xs font-medium ${isOff ? "line-through text-slate-600" : isToday
                                    ? "text-violet-400"
                                    : isFuture
                                        ? "text-slate-600"
                                        : "text-slate-400"
                                }`}>
                                {day}
                            </span>
                        </div>
                    );
                })}
            </div>

            <div className="flex justify-between mt-3">
                <span className="text-xs text-slate-500">
                    {formatDuration(weekStats.totalWorkedMinutes).replace("+", "")} travaillées
                </span>
                <span className="text-xs text-slate-500">objectif {formatDuration(expected).replace("+", "")}</span>
            </div>
        </Card>
    );
}
