"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrewVesselGuard = void 0;
const common_1 = require("@nestjs/common");
let CrewVesselGuard = class CrewVesselGuard {
    canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user || user.role !== 'Crew')
            return true;
        const paramVesselId = request.params.vesselId ?? request.params.id;
        const vesselId = parseInt(paramVesselId, 10);
        if (!isNaN(vesselId) && user.vessel_id !== vesselId) {
            throw new common_1.ForbiddenException(`Accès refusé. Vous n'êtes pas assigné au navire #${vesselId}.`);
        }
        return true;
    }
};
exports.CrewVesselGuard = CrewVesselGuard;
exports.CrewVesselGuard = CrewVesselGuard = __decorate([
    (0, common_1.Injectable)()
], CrewVesselGuard);
//# sourceMappingURL=crew-vessel.guard.js.map