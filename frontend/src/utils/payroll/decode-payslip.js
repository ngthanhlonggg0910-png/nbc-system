const DEFAULT_PAYSLIP_STAFF_ID = "NBC012345";
export function decodePayslipPayloadFromMap(staffId, encodedByStaffId) {
    const encoded = encodedByStaffId[staffId] ?? encodedByStaffId[DEFAULT_PAYSLIP_STAFF_ID];
    const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
}
