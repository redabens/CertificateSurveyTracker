"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlarmService = exports.ALARM_LEVELS = void 0;
const common_1 = require("@nestjs/common");
exports.ALARM_LEVELS = {
    OVERDUE: 'OVERDUE / IMMEDIATE',
    RED: 'RED - <1 MONTH',
    YELLOW: 'YELLOW - 1 TO 3 MONTHS',
    GREEN: 'GREEN - 3 TO 6 MONTHS',
    MONITOR: 'MONITOR >6 MONTHS',
    NA: 'N/A',
};
let AlarmService = class AlarmService {
    calculate(dueDateStr, expirationDateStr, windowVal) {
        let target = dueDateStr || expirationDateStr;
        if (!target)
            return exports.ALARM_LEVELS.NA;
        let isUsingDueDate = !!dueDateStr;
        if (dueDateStr && dueDateStr.trim().startsWith('[')) {
            try {
                const dates = JSON.parse(dueDateStr);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const parsedDates = dates
                    .map((d) => new Date(d))
                    .filter((d) => !isNaN(d.getTime()));
                if (parsedDates.length > 0) {
                    parsedDates.sort((a, b) => a.getTime() - b.getTime());
                    const nextUpcoming = parsedDates.find((d) => d.getTime() >= today.getTime());
                    if (nextUpcoming) {
                        target = nextUpcoming.toISOString().substring(0, 10);
                        isUsingDueDate = true;
                    }
                    else {
                        target = parsedDates[parsedDates.length - 1]
                            .toISOString()
                            .substring(0, 10);
                        isUsingDueDate = true;
                    }
                }
            }
            catch (e) {
                console.warn('[AlarmService] Failed to parse JSON array for due_date:', e);
            }
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let targetDate = new Date(target);
        if (isNaN(targetDate.getTime()))
            return exports.ALARM_LEVELS.NA;
        targetDate.setHours(0, 0, 0, 0);
        if (isUsingDueDate && windowVal) {
            const windowValStr = String(windowVal).trim();
            if (windowValStr.startsWith('[')) {
                try {
                    const windows = JSON.parse(windowValStr);
                    const windowDeadlines = windows.map((w) => {
                        if (w.mode === 'custom') {
                            const endD = new Date(w.endDate);
                            return isNaN(endD.getTime()) ? null : endD;
                        }
                        else {
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
                        .filter(Boolean);
                    if (windowDeadlines.length > 0) {
                        windowDeadlines.sort((a, b) => a.getTime() - b.getTime());
                        const nextUpcomingWindow = windowDeadlines.find((d) => d.getTime() >= today.getTime());
                        if (nextUpcomingWindow) {
                            targetDate = nextUpcomingWindow;
                        }
                        else {
                            targetDate = windowDeadlines[windowDeadlines.length - 1];
                        }
                        targetDate.setHours(0, 0, 0, 0);
                    }
                }
                catch (e) {
                    console.warn('[AlarmService] Failed to parse multiple windows JSON:', e);
                }
            }
            else {
                const months = parseInt(windowValStr, 10);
                if (!isNaN(months) && months > 0) {
                    targetDate.setMonth(targetDate.getMonth() + months);
                }
            }
        }
        const diffDays = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0)
            return exports.ALARM_LEVELS.OVERDUE;
        if (diffDays <= 30)
            return exports.ALARM_LEVELS.RED;
        if (diffDays <= 90)
            return exports.ALARM_LEVELS.YELLOW;
        if (diffDays <= 180)
            return exports.ALARM_LEVELS.GREEN;
        return exports.ALARM_LEVELS.MONITOR;
    }
    computeVesselStatus(alarmLevels) {
        if (alarmLevels.some((a) => a === exports.ALARM_LEVELS.OVERDUE || a === exports.ALARM_LEVELS.RED))
            return 'Imminent';
        if (alarmLevels.some((a) => a === exports.ALARM_LEVELS.YELLOW))
            return 'Attention';
        if (alarmLevels.some((a) => a === exports.ALARM_LEVELS.GREEN))
            return 'Suivi';
        return 'Normal';
    }
    hasChanged(previous, current) {
        return previous !== current;
    }
};
exports.AlarmService = AlarmService;
exports.AlarmService = AlarmService = __decorate([
    (0, common_1.Injectable)()
], AlarmService);
//# sourceMappingURL=alarm.service.js.map