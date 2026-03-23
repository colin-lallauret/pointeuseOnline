# Spécifications de l'Application de Pointeuse (Stage)

## Stack Technique
- **Framework:** Next.js (App Router)
- **Base de données & Auth:** Supabase
- **Styling:** Tailwind CSS + Shadcn UI (Mobile First)

## Règles Métier (Logique de Temps)
1. **Objectif Hebdomadaire :** 35 heures (du lundi au vendredi).
2. **Objectif Journalier :** 7 heures de travail effectif.
3. **Reset Hebdomadaire :** Les heures supplémentaires accumulées ne se reportent JAMAIS sur la semaine suivante. Elles servent uniquement à moduler les départs anticipés durant la semaine en cours (souvent le vendredi).
4. **Structure du Pointage (4 fois par jour) :**
   - Arrivée Matin
   - Début Pause Déjeuner
   - Fin Pause Déjeuner
   - Départ Soir
5. **Plages Horaires Autorisées :**
   - **Matin (Arrivée) :** 07h30 - 09h30
   - **Midi (Pause) :** 11h30 - 14h00
   - **Soir (Départ) :** 16h30 - 19h00 (Sauf Vendredi : dès 16h00)
   - *Note : Tout pointage hors plage génère une alerte/anomalie.*

## Fonctionnalités Clés
- **Dashboard Temps Réel :** Affiche le temps travaillé aujourd'hui et le cumul de la semaine.
- **Calculateur de Départ :** Après le 3ème pointage (reprise après manger), l'app doit calculer l'heure théorique de départ pour atteindre les 7h du jour, ET l'heure de départ possible si on utilise le crédit d'heures accumulé les jours précédents.
- **Gestion des Pointages :** Liste des pointages avec possibilité de modifier une erreur.
- **Indicateur d'Anomalie :** Signal visuel si un pointage est hors plage.