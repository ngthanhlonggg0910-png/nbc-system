import { payslipBinaryByStaffId } from "./payslips";
import { decodePayslipPayloadFromMap } from "./decode-payslip";
export function decodePayslipPayload(staffId) {
    return decodePayslipPayloadFromMap(staffId, payslipBinaryByStaffId);
}
