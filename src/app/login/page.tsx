"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const supabase = createClient();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsLoading(true);

        if (isSignUp) {
            const { error } = await supabase.auth.signUp({ email, password });
            if (error) {
                toast.error(error.message);
            } else {
                toast.success("Compte créé ! Vérifiez votre email.");
            }
        } else {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
                toast.error("Identifiants incorrects");
            } else {
                window.location.href = "/";
            }
        }
        setIsLoading(false);
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-6">
            {/* Logo / Title */}
            <div className="mb-10 text-center">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-4xl mx-auto mb-4 shadow-2xl shadow-violet-500/30">
                    ⏱️
                </div>
                <h1 className="text-3xl font-bold text-white">Pointeuse</h1>
                <p className="text-slate-400 mt-1">Suivez vos heures de stage</p>
            </div>

            {/* Card */}
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
                <h2 className="text-xl font-semibold text-white mb-6">
                    {isSignUp ? "Créer un compte" : "Se connecter"}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-slate-300">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="vous@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-violet-500 h-12 rounded-xl"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-slate-300">Mot de passe</Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-violet-500 h-12 rounded-xl"
                        />
                    </div>

                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-14 text-base font-semibold rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 border-0 shadow-lg shadow-violet-500/25 transition-all duration-200 active:scale-95"
                    >
                        {isLoading ? "Chargement..." : isSignUp ? "Créer le compte" : "Se connecter"}
                    </Button>
                </form>

                <button
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="w-full mt-4 text-sm text-slate-400 hover:text-slate-200 transition-colors"
                >
                    {isSignUp
                        ? "Déjà un compte ? Se connecter"
                        : "Pas encore de compte ? S'inscrire"}
                </button>
            </div>
        </div>
    );
}
