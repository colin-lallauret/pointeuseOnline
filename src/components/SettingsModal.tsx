"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface SettingsModalProps {
    user: { id: string; email?: string } | null;
    onClose: () => void;
    onSignOut: () => void;
}

export function SettingsModal({ user, onClose, onSignOut }: SettingsModalProps) {
    const supabase = createClient();
    const [isResetting, setIsResetting] = useState(false);

    async function handleResetPassword() {
        if (!user?.email) {
            toast.error("Email introuvable");
            return;
        }
        setIsResetting(true);
        const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
            redirectTo: `${window.location.origin}/login`,
        });

        if (error) {
            toast.error("Erreur lors de l'envoi de l'email");
        } else {
            toast.success("📧 Email de réinitialisation envoyé !");
        }
        setIsResetting(false);
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl p-6 animate-in slide-in-from-bottom-4 duration-300">
                {/* Handle */}
                <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-6" />

                {/* Title */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl">
                        ⚙️
                    </div>
                    <div>
                        <p className="text-lg font-bold text-white">Paramètres</p>
                        <p className="text-xs text-slate-400">Gérer votre compte</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Email */}
                    <div>
                        <label className="text-xs text-slate-400 uppercase tracking-wider font-medium block mb-1.5">
                            Adresse Email
                        </label>
                        <div className="w-full bg-slate-800/50 border border-slate-800 rounded-2xl px-4 py-3 text-white text-sm">
                            {user?.email || "Non renseigné"}
                        </div>
                    </div>
                </div>

                {/* Buttons */}
                <div className="mt-8 space-y-3">
                    <button
                        onClick={handleResetPassword}
                        disabled={isResetting || !user?.email}
                        className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm active:scale-95 transition-all disabled:opacity-50"
                    >
                        {isResetting ? "Envoi en cours..." : "Changer mon mot de passe"}
                    </button>

                    <button
                        onClick={onSignOut}
                        className="w-full py-3 rounded-2xl bg-red-950/50 border border-red-800/50 text-red-400 font-medium text-sm active:scale-95 transition-all hover:bg-red-900/50 flex items-center justify-center gap-2"
                    >
                        👋 Se déconnecter
                    </button>

                    <button
                        onClick={onClose}
                        className="w-full py-3 rounded-2xl bg-transparent text-slate-400 font-medium text-sm active:scale-95 transition-all hover:bg-slate-800/50"
                    >
                        Annuler
                    </button>
                </div>
            </div>
        </div>
    );
}
