export declare class EmailTemplateService {
    buildCertificateAlert(vessel: any, cert: any, prevAlarm: string): {
        subject: string;
        text: string;
        html: string;
    };
    buildOtpVerification(otp: string): {
        subject: string;
        text: string;
        html: string;
    };
    buildUserInvitation(name: string, otp: string): {
        subject: string;
        text: string;
        html: string;
    };
}
