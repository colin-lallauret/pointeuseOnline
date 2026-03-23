"use client";

import React, { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CheckIn, CheckInType } from "@/types";
import {
  getNextCheckIn,
  isWithinTimeRange,
  computeDayStats,
  computeWeekStats,
  computeDepartureEstimate,
  formatDuration,
  CHECK_IN_LABELS,
  CHECK_IN_ICONS,
} from "@/lib/timeUtils";
import {
  format,
  parseISO,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  addWeeks,
  addDays,
} from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CheckInButton } from "@/components/CheckInButton";
import { DepartureWidget } from "@/components/DepartureWidget";
import { WeekBar } from "@/components/WeekBar";
import { HistoryModal } from "@/components/HistoryModal";
import { ManualEntryModal } from "@/components/ManualEntryModal";

const TZ = "Europe/Paris";

interface EditTarget {
  type: CheckInType;
  existingCheckIn: CheckIn | null;
  defaultDate: string;
}

export default function DashboardPage() {
  const supabase = createClient();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [todayCheckIns, setTodayCheckIns] = useState<CheckIn[]>([]);
  const [weekCheckIns, setWeekCheckIns] = useState<CheckIn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);

  // Horloge côté client uniquement
  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser({ id: data.user.id, email: data.user.email });
    });
  }, []);

  const resolved = now ?? new Date();
  const parisNow = toZonedTime(resolved, TZ);
  const weekRef = toZonedTime(addWeeks(resolved, weekOffset), TZ);
  const isCurrentWeek = weekOffset === 0;

  const fetchCheckIns = useCallback(async () => {
    if (!user) return;
    const currentTime = now ?? new Date();
    const parisToday = toZonedTime(currentTime, TZ);
    const weekRefDate = toZonedTime(addWeeks(currentTime, weekOffset), TZ);

    const todayStart = startOfDay(parisToday).toISOString();
    const todayEnd = endOfDay(parisToday).toISOString();
    const weekStart = startOfWeek(weekRefDate, { weekStartsOn: 1 }).toISOString();
    const weekEnd = endOfWeek(weekRefDate, { weekStartsOn: 1 }).toISOString();

    const [{ data: todayData }, { data: weekData }] = await Promise.all([
      supabase
        .from("check_ins")
        .select("*")
        .eq("user_id", user.id)
        .gte("timestamp", todayStart)
        .lte("timestamp", todayEnd)
        .order("timestamp", { ascending: true }),
      supabase
        .from("check_ins")
        .select("*")
        .eq("user_id", user.id)
        .gte("timestamp", weekStart)
        .lte("timestamp", weekEnd)
        .order("timestamp", { ascending: true }),
    ]);

    setTodayCheckIns((todayData as CheckIn[]) || []);
    setWeekCheckIns((weekData as CheckIn[]) || []);
    setIsLoading(false);
  }, [user, supabase, weekOffset, now]);

  useEffect(() => {
    fetchCheckIns();
  }, [fetchCheckIns]);

  const nextCheckIn = getNextCheckIn(todayCheckIns);
  const isOutOfRange = nextCheckIn ? !isWithinTimeRange(nextCheckIn, resolved) : false;

  const todayStats = computeDayStats(todayCheckIns)[format(parisNow, "yyyy-MM-dd")] || {
    workedMinutes: 0,
    isComplete: false,
  };
  const weekStats = computeWeekStats(weekCheckIns, weekRef);
  const departure = computeDepartureEstimate(todayStats, weekStats.creditMinutes, resolved);

  async function handleCheckIn() {
    if (!nextCheckIn || !user) return;
    if (isOutOfRange) {
      const confirmed = window.confirm(
        `⚠️ Hors plage horaire pour "${CHECK_IN_LABELS[nextCheckIn]}". Pointer quand même ?`
      );
      if (!confirmed) return;
    }
    const { error } = await supabase.from("check_ins").insert({
      user_id: user.id,
      type: nextCheckIn,
      timestamp: resolved.toISOString(),
      is_manual: false,
    });
    if (error) {
      toast.error("Erreur lors du pointage");
    } else {
      toast.success(`✅ ${CHECK_IN_LABELS[nextCheckIn]} enregistré !`);
      await fetchCheckIns();
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  // Ouvre le modal d'édition/ajout
  function openEdit(type: CheckInType, existingCheckIn: CheckIn | null, dayKey: string) {
    setEditTarget({ type, existingCheckIn, defaultDate: dayKey });
  }

  const weekStart = startOfWeek(weekRef, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekRef, { weekStartsOn: 1 });
  const weekLabel = now
    ? isCurrentWeek
      ? "Cette semaine"
      : `${format(weekStart, "d MMM", { locale: fr })} – ${format(weekEnd, "d MMM yyyy", { locale: fr })}`
    : "";

  const dayLabel = now ? format(parisNow, "EEEE d MMMM yyyy", { locale: fr }) : "";
  const timeStr = now ? format(parisNow, "HH:mm:ss") : "--:--:--";
  const todayKey = format(parisNow, "yyyy-MM-dd");

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col max-w-md mx-auto">
      {/* Header */}
      <header className="px-5 pt-14 pb-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-widest font-medium capitalize">{dayLabel}</p>
          <h1 className="text-4xl font-bold text-white tabular-nums mt-0.5">{timeStr}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(true)}
            className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-300 hover:bg-slate-700 active:scale-95 transition-all"
            title="Historique"
          >
            📋
          </button>
          <button
            onClick={handleSignOut}
            className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-300 hover:bg-slate-700 active:scale-95 transition-all"
            title="Déconnexion"
          >
            👋
          </button>
        </div>
      </header>

      <div className="flex-1 px-5 space-y-4 pb-8">
        {/* Week Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setWeekOffset((o) => o - 1)}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white active:scale-95 transition-all px-3 py-2 rounded-xl hover:bg-slate-800"
          >
            <span className="text-lg">←</span>
            <span className="text-xs font-medium">Préc.</span>
          </button>
          <div className="text-center">
            <p className="text-sm font-semibold text-white capitalize">{weekLabel}</p>
            {!isCurrentWeek && (
              <button
                onClick={() => setWeekOffset(0)}
                className="text-xs text-violet-400 hover:text-violet-300 mt-0.5 transition-colors"
              >
                Revenir à maintenant
              </button>
            )}
          </div>
          <button
            onClick={() => setWeekOffset((o) => o + 1)}
            disabled={weekOffset >= 0}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white active:scale-95 transition-all px-3 py-2 rounded-xl hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            <span className="text-xs font-medium">Suiv.</span>
            <span className="text-lg">→</span>
          </button>
        </div>

        {/* Week Progress */}
        <WeekBar weekStats={weekStats} weekRef={weekRef} isCurrentWeek={isCurrentWeek} />

        {/* === SEMAINE COURANTE === */}
        {isCurrentWeek && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-slate-900 border-slate-800 rounded-3xl p-4">
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Aujourd'hui</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {formatDuration(todayStats.workedMinutes).replace("+", "")}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">sur 7h00</p>
              </Card>
              <Card className={`rounded-3xl p-4 border ${weekStats.creditMinutes >= 0 ? "bg-emerald-950/50 border-emerald-800/50" : "bg-red-950/50 border-red-800/50"}`}>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Crédit semaine</p>
                <p className={`text-2xl font-bold mt-1 ${weekStats.creditMinutes >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {formatDuration(weekStats.creditMinutes)}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{weekStats.creditMinutes >= 0 ? "d'avance" : "de retard"}</p>
              </Card>
            </div>

            {/* Timeline pointages du jour — chaque ligne est cliquable */}
            <Card className="bg-slate-900 border-slate-800 rounded-3xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Pointages du jour</p>
                <span className="text-xs text-slate-500">Appuyez pour modifier</span>
              </div>
              <div className="space-y-2">
                {(["morning_in", "lunch_out", "lunch_in", "evening_out"] as CheckInType[]).map((type) => {
                  const ci = todayCheckIns.find((c) => c.type === type);
                  const isNext = nextCheckIn === type;
                  return (
                    <button
                      key={type}
                      onClick={() => openEdit(type, ci ?? null, todayKey)}
                      className={`w-full flex items-center justify-between rounded-2xl px-4 py-3 transition-all active:scale-98 text-left ${ci
                        ? "bg-slate-800/60 hover:bg-slate-700/60"
                        : isNext
                          ? "bg-violet-950/50 border border-violet-700/50 hover:bg-violet-900/40"
                          : "bg-slate-900/50 opacity-50 hover:opacity-70"
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{CHECK_IN_ICONS[type]}</span>
                        <span className={`text-sm font-medium ${ci ? "text-white" : isNext ? "text-violet-300" : "text-slate-500"}`}>
                          {CHECK_IN_LABELS[type]}
                        </span>
                        {ci?.is_manual && (
                          <Badge variant="outline" className="text-xs border-amber-700 text-amber-400">Manuel</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {ci ? (
                          <>
                            <span className="text-sm font-mono font-semibold text-slate-200">
                              {format(toZonedTime(parseISO(ci.timestamp), TZ), "HH:mm")}
                            </span>
                            <span className="text-slate-500 text-xs">✏️</span>
                          </>
                        ) : isNext ? (
                          <span className="text-xs text-violet-400 animate-pulse">En attente…</span>
                        ) : (
                          <span className="text-xs text-slate-600">+ ajouter</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>

            {departure.forDailyGoal && (
              <DepartureWidget departure={departure} creditMinutes={weekStats.creditMinutes} />
            )}

            {!isLoading && (
              <CheckInButton
                nextCheckIn={nextCheckIn}
                isOutOfRange={isOutOfRange}
                onCheckIn={handleCheckIn}
              />
            )}
          </>
        )}

        {/* === SEMAINES HORS COURANTE === */}
        {!isCurrentWeek && (
          <Card className="bg-slate-900 border-slate-800 rounded-3xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Résumé de la semaine</p>
              <span className="text-xs text-slate-500">Appuyez pour modifier</span>
            </div>
            <div className="space-y-2">
              {(() => {
                // Toujours afficher les 5 jours Lun→Ven, même sans pointage
                const monday = startOfWeek(weekRef, { weekStartsOn: 1 });
                const allDays = Array.from({ length: 5 }, (_, i) =>
                  format(addDays(monday, i), "yyyy-MM-dd")
                );
                return allDays.map((day) => {
                  const stats = weekStats.days[day];
                  const dayDate = toZonedTime(parseISO(`${day}T12:00:00`), TZ);
                  const dayName = format(dayDate, "EEEE d MMM", { locale: fr });
                  const workedMin = stats?.workedMinutes ?? 0;
                  const isComplete = stats?.isComplete ?? false;

                  return (
                    <details key={day} className="group">
                      <summary
                        className={`flex items-center justify-between rounded-2xl px-4 py-3 cursor-pointer list-none transition-all hover:bg-slate-800/80 ${isComplete ? "bg-slate-800/60" : "bg-slate-900/50"
                          }`}
                      >
                        <div>
                          <p className="text-sm font-medium text-white capitalize">{dayName}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {stats?.morning_in
                              ? `${format(toZonedTime(parseISO(stats.morning_in), TZ), "HH:mm")} → ${stats.evening_out
                                ? format(toZonedTime(parseISO(stats.evening_out), TZ), "HH:mm")
                                : "?"
                              }`
                              : "Aucun pointage · Appuyez pour ajouter"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className={`text-sm font-bold tabular-nums ${isComplete ? "text-white" : "text-slate-500"}`}>
                              {workedMin > 0 ? formatDuration(workedMin).replace("+", "") : "—"}
                            </p>
                            {isComplete && (
                              <p className={`text-xs mt-0.5 ${workedMin >= 420 ? "text-emerald-400" : "text-red-400"}`}>
                                {formatDuration(workedMin - 420)}
                              </p>
                            )}
                          </div>
                          <span className="text-slate-600 text-xs group-open:rotate-90 transition-transform">▶</span>
                        </div>
                      </summary>

                      {/* Détail des 4 pointages du jour */}
                      <div className="mt-1 ml-2 space-y-1 pb-1">
                        {(["morning_in", "lunch_out", "lunch_in", "evening_out"] as CheckInType[]).map((type) => {
                          const ci = weekCheckIns.find(
                            (c) =>
                              c.type === type &&
                              format(toZonedTime(parseISO(c.timestamp), TZ), "yyyy-MM-dd") === day
                          );
                          return (
                            <button
                              key={type}
                              onClick={() => openEdit(type, ci ?? null, day)}
                              className="w-full flex items-center justify-between rounded-xl px-4 py-2.5 bg-slate-800/40 hover:bg-slate-700/60 active:scale-98 transition-all text-left"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="text-base">{CHECK_IN_ICONS[type]}</span>
                                <span className="text-xs text-slate-300">{CHECK_IN_LABELS[type]}</span>
                                {ci?.is_manual && (
                                  <Badge variant="outline" className="text-xs border-amber-700/50 text-amber-500 py-0">
                                    Manuel
                                  </Badge>
                                )}
                              </div>
                              {ci ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-mono font-semibold text-white">
                                    {format(toZonedTime(parseISO(ci.timestamp), TZ), "HH:mm")}
                                  </span>
                                  <span className="text-slate-500 text-xs">✏️</span>
                                </div>
                              ) : (
                                <span className="text-xs text-violet-500">+ ajouter</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </details>
                  );
                });
              })()}
            </div>

            <div className="mt-3 pt-3 border-t border-slate-800 flex justify-between">
              <span className="text-sm text-slate-400">Total semaine</span>
              <div className="text-right">
                <span className="text-sm font-bold text-white tabular-nums">
                  {formatDuration(weekStats.totalWorkedMinutes).replace("+", "")}
                </span>
                <span className={`text-xs ml-2 font-semibold ${weekStats.creditMinutes >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  ({formatDuration(weekStats.creditMinutes)})
                </span>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* History Modal */}
      {showHistory && (
        <HistoryModal
          checkIns={weekCheckIns}
          onClose={() => setShowHistory(false)}
          onUpdate={fetchCheckIns}
          userId={user?.id || ""}
        />
      )}

      {/* Manual Entry / Edit Modal */}
      {editTarget && user && (
        <ManualEntryModal
          type={editTarget.type}
          existingCheckIn={editTarget.existingCheckIn}
          defaultDate={editTarget.defaultDate}
          userId={user.id}
          onClose={() => setEditTarget(null)}
          onSave={fetchCheckIns}
        />
      )}
    </div>
  );
}
