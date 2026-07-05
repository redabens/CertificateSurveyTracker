export declare const ALARM_LEVELS: {
    readonly OVERDUE: "OVERDUE / IMMEDIATE";
    readonly RED: "RED - <1 MONTH";
    readonly YELLOW: "YELLOW - 1 TO 3 MONTHS";
    readonly GREEN: "GREEN - 3 TO 6 MONTHS";
    readonly MONITOR: "MONITOR >6 MONTHS";
    readonly NA: "N/A";
};
export type AlarmLevel = (typeof ALARM_LEVELS)[keyof typeof ALARM_LEVELS];
export type VesselStatus = 'Imminent' | 'Attention' | 'Suivi' | 'Normal';
export declare class AlarmService {
    calculate(dueDateStr: string | null | undefined, expirationDateStr: string | null | undefined): AlarmLevel;
    computeVesselStatus(alarmLevels: AlarmLevel[]): VesselStatus;
    hasChanged(previous: string, current: AlarmLevel): boolean;
}
