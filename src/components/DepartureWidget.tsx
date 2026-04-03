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
                    <p className="text-sm font-semibold text-white">À quelle heure partir ?</p>
                    <p className="text-xs text-slate-400">Calculé selon vos pointages du jour</p>
                </div>
            </div>

            <div className="space-y-3">
                {/* Option 1 : faire pile 7h aujourd'hui */}
                <div className="flex items-center justify-between bg-slate-800/60 rounded-2xl px-4 py-3">
                    <div>
                        <p className="text-sm font-medium text-white">Pour faire exactement 7h</p>
                        <p className="text-xs text-slate-500 mt-0.5">Objectif journalier standard</p>
                    </div>
                    <p className="text-2xl font-bold text-white tabular-nums">
                        {departure.forDailyGoal}
                    </p>
                </div>

                {/* Option 2 : utiliser son crédit */}
                {creditMinutes > 0 && departure.withWeekCredit && (
                    <div className="flex items-center justify-between bg-violet-900/40 border border-violet-800/50 rounded-2xl px-4 py-3">
                        <div>
                            <p className="text-sm font-medium text-violet-200">En utilisant votre crédit</p>
                            <p className="text-xs text-violet-400 mt-0.5">
                                {departure.isCapped 
                                    ? "Limité par l'heure de départ minimum" 
                                    : "Équilibre la semaine exacte à 35h"}
                            </p>
                        </div>
                        <p className="text-2xl font-bold text-violet-300 tabular-nums">
                            {departure.withWeekCredit}
                        </p>
                    </div>
                )}

                {/* Pas de crédit / en retard */}
                {creditMinutes <= 0 && (
                    <div className="flex items-center gap-2 px-2">
                        <span className="text-amber-400 text-sm">ℹ️</span>
                        <p className="text-xs text-slate-400">
                            {creditMinutes < 0
                                ? `Tu as ${formatDuration(Math.abs(creditMinutes))} de retard cette semaine — reste jusqu'à l'heure ci-dessus pour limiter le déficit`
                                : "Aucun crédit d'heures disponible cette semaine"
                            }
                        </p>
                    </div>
                )}
            </div>
        </Card>
    );
}
