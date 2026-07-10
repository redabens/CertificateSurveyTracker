import { Injectable } from '@nestjs/common';

/**
 * AlarmService — Source unique de vérité pour le calcul des niveaux d'alarme des certificats.
 *
 * SRP: Ce service NE fait QUE calculer les niveaux d'alarme à partir de dates.
 *      Aucun accès DB, aucun envoi d'email, aucune logique métier externe.
 *
 * Usage: Injectez AlarmService partout où un alarm_status doit être calculé
 *        (contrôleurs, email scheduler, export Excel).
 */

export const ALARM_LEVELS = {
  OVERDUE: 'OVERDUE / IMMEDIATE',
  RED: 'RED - <1 MONTH',
  YELLOW: 'YELLOW - 1 TO 3 MONTHS',
  GREEN: 'GREEN - 3 TO 6 MONTHS',
  MONITOR: 'MONITOR >6 MONTHS',
  NA: 'N/A',
} as const;

export type AlarmLevel = (typeof ALARM_LEVELS)[keyof typeof ALARM_LEVELS];

export type VesselStatus = 'Imminent' | 'Attention' | 'Suivi' | 'Normal';

@Injectable()
export class AlarmService {
  /**
   * Calcule le niveau d'alarme d'un certificat.
   * Priorité: due_date (date de visite) > expiration_date (date d'expiration).
   * @returns AlarmLevel (string constant)
   */
  calculate(
    dueDateStr: string | null | undefined,
    expirationDateStr: string | null | undefined,
    windowVal?: string | number | null,
  ): AlarmLevel {
    let target = dueDateStr || expirationDateStr;
    if (!target) return ALARM_LEVELS.NA;

    let isUsingDueDate = !!dueDateStr;

    // Parse JSON array of dates if multiple surveys are scheduled
    if (dueDateStr && dueDateStr.trim().startsWith('[')) {
      try {
        const dates = JSON.parse(dueDateStr) as string[];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const parsedDates = dates
          .map((d) => new Date(d))
          .filter((d) => !isNaN(d.getTime()));

        if (parsedDates.length > 0) {
          parsedDates.sort((a, b) => a.getTime() - b.getTime());
          const nextUpcoming = parsedDates.find(
            (d) => d.getTime() >= today.getTime(),
          );

          if (nextUpcoming) {
            target = nextUpcoming.toISOString().substring(0, 10);
            isUsingDueDate = true;
          } else {
            target = parsedDates[parsedDates.length - 1]
              .toISOString()
              .substring(0, 10);
            isUsingDueDate = true;
          }
        }
      } catch (e) {
        console.warn(
          '[AlarmService] Failed to parse JSON array for due_date:',
          e,
        );
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let targetDate = new Date(target);
    if (isNaN(targetDate.getTime())) return ALARM_LEVELS.NA;
    targetDate.setHours(0, 0, 0, 0);

    // Apply authorized window offsets or custom date ranges to due date to calculate absolute deadline
    if (isUsingDueDate && windowVal) {
      const windowValStr = String(windowVal).trim();
      if (windowValStr.startsWith('[')) {
        try {
          const windows = JSON.parse(windowValStr) as any[];
          const windowDeadlines = windows
            .map((w) => {
              if (w.mode === 'custom') {
                const endD = new Date(w.endDate);
                return isNaN(endD.getTime()) ? null : endD;
              } else {
                const months = parseInt(String(w.offsetMonths), 10);
                if (!isNaN(months) && months > 0) {
                  const targetD = new Date(target);
                  if (!isNaN(targetD.getTime())) {
                    targetD.setMonth(targetD.getMonth() + months);
                    return targetD;
                  }
                }
              }
              return null;
            })
            .filter(Boolean) as Date[];

          if (windowDeadlines.length > 0) {
            windowDeadlines.sort((a, b) => a.getTime() - b.getTime());
            const nextUpcomingWindow = windowDeadlines.find(
              (d) => d.getTime() >= today.getTime(),
            );
            if (nextUpcomingWindow) {
              targetDate = nextUpcomingWindow;
            } else {
              targetDate = windowDeadlines[windowDeadlines.length - 1];
            }
            targetDate.setHours(0, 0, 0, 0);
          }
        } catch (e) {
          console.warn(
            '[AlarmService] Failed to parse multiple windows JSON:',
            e,
          );
        }
      } else {
        // Fallback to legacy single window value (months)
        const months = parseInt(windowValStr, 10);
        if (!isNaN(months) && months > 0) {
          targetDate.setMonth(targetDate.getMonth() + months);
        }
      }
    }

    const diffDays = Math.ceil(
      (targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays < 0) return ALARM_LEVELS.OVERDUE;
    if (diffDays <= 30) return ALARM_LEVELS.RED;
    if (diffDays <= 90) return ALARM_LEVELS.YELLOW;
    if (diffDays <= 180) return ALARM_LEVELS.GREEN;
    return ALARM_LEVELS.MONITOR;
  }

  /**
   * Dérive le statut global d'un navire à partir des niveaux d'alarme de ses certificats.
   */
  computeVesselStatus(alarmLevels: AlarmLevel[]): VesselStatus {
    if (
      alarmLevels.some(
        (a) => a === ALARM_LEVELS.OVERDUE || a === ALARM_LEVELS.RED,
      )
    )
      return 'Imminent';
    if (alarmLevels.some((a) => a === ALARM_LEVELS.YELLOW)) return 'Attention';
    if (alarmLevels.some((a) => a === ALARM_LEVELS.GREEN)) return 'Suivi';
    return 'Normal';
  }

  /**
   * Indique si l'alarme a changé (utilisé par le scheduler d'emails pour filtrer les alertes).
   */
  hasChanged(previous: string, current: AlarmLevel): boolean {
    return previous !== current;
  }
}
