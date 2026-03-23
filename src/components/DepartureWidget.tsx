"use client";

import { DepartureEstimate } from "@/types";
import { Card } from "@/components/ui/card";
import { formatDuration } from "@/lib/timeUtils";

interface DepartureWidgetProps {
    departure: DepartureEstimate;
    creditMinutes: number;
}

export function DepartureWidget({ departure, creditMinutes }: DepartureWidgetProps) {
    return (
        <Card className="bg-gradient-to-br from-slate-900 to-indigo-950/30 border-indigo-800/40 rounded-3xl p-5">
            <div className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center text-lg">
                    🎯
                </div>
                <div>
                    <p className="text-sm font-semibold text-white">Heure de départ estimée</p>
                    <p className="text-xs text-slate-400">Calculé après votre retour de déjeuner</p>
                </div>
            </div>

            <div className="space-y-3">
                {/* For 7h per day */}
                <div className="flex items-center justify-between bg-slate-800/60 rounded-2xl px-4 py-3">
                    <div>
                        <p className="text-xs text-slate-400">Pour faire 7h aujourd'hui</p>
                        <p className="text-xs text-slate-500 mt-0.5">Objectif journalier</p>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-bold text-white tabular-nums">
                            {departure.forDailyGoal}
                        </p>
                    </div>
                </div>

                {/* With weekly credit */}
                {creditMinutes > 0 && departure.withWeekCredit && departure.withWeekCredit !== departure.forDailyGoal && (
                    <div className="flex items-center justify-between bg-emerald-950/40 border border-emerald-800/30 rounded-2xl px-4 py-3">
                        <div>
                            <p className="text-xs text-emerald-400">Avec crédit semaine</p>
                            <p className="text-xs text-emerald-600 mt-0.5">
                                {formatDuration(creditMinutes)} d'avance
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-bold text-emerald-400 tabular-nums">
                                {departure.withWeekCredit}
                            </p>
                        </div>
                    </div>
                )}

                {creditMinutes <= 0 && (
                    <div className="flex items-center gap-2 px-2">
                        <span className="text-amber-400 text-sm">ℹ️</span>
                        <p className="text-xs text-slate-400">
                            {creditMinutes < 0
                                ? `Vous avez ${formatDuration(Math.abs(creditMinutes))} de retard cette semaine`
                                : "Aucun crédit d'heures cette semaine"
                            }
                        </p>
                    </div>
                )}
            </div>
        </Card>
    );
}
