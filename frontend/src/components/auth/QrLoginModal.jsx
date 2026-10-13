import React, { useState, useEffect, useRef } from "react";
import { QrCode, ScanLine, Camera, X } from "lucide-react";
import { parseEmployeeQrValue } from "@/utils/employee-qr";
export function QrLoginModal({ onClose, onDetected }) {
    const videoRef = useRef(null);
    const streamRef = useRef(undefined);
    const [manualValue, setManualValue] = useState("");
    const [message, setMessage] = useState("Đang mở camera...");
    useEffect(() => {
        let stopped = false;
        let frame = 0;
        const DetectorApi = window.BarcodeDetector;
        if (!DetectorApi || !navigator.mediaDevices?.getUserMedia) {
            queueMicrotask(() => setMessage("Thiết bị chưa hỗ trợ quét trực tiếp. Bạn có thể nhập nội dung QR ở bên dưới."));
            return;
        }
        const detector = new DetectorApi({ formats: ["qr_code"] });
        navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false }).then(async (stream) => {
            if (stopped) {
                stream.getTracks().forEach((track) => track.stop());
                return;
            }
            streamRef.current = stream;
            if (!videoRef.current)
                return;
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
            setMessage("Đưa mã QR nhân viên vào giữa khung hình");
            const scan = async () => {
                if (stopped || !videoRef.current)
                    return;
                try {
                    const results = await detector.detect(videoRef.current);
                    const staffId = results[0] ? parseEmployeeQrValue(results[0].rawValue) : "";
                    if (staffId) {
                        onDetected(staffId);
                        return;
                    }
                }
                catch { /* Tiếp tục quét khung hình tiếp theo. */ }
                frame = requestAnimationFrame(scan);
            };
            frame = requestAnimationFrame(scan);
        }).catch(() => setMessage("Không thể mở camera. Hãy cấp quyền camera hoặc nhập nội dung QR ở bên dưới."));
        return () => {
            stopped = true;
            cancelAnimationFrame(frame);
            streamRef.current?.getTracks().forEach((track) => track.stop());
        };
    }, [onDetected]);
    function useManualValue() {
        const staffId = parseEmployeeQrValue(manualValue);
        if (staffId)
            onDetected(staffId);
        else
            setMessage("Không tìm thấy mã nhân viên hợp lệ trong nội dung QR.");
    }
    return (<div className="modal-backdrop qr-login-backdrop" onMouseDown={onClose}>
      <section className="qr-login-modal" role="dialog" aria-modal="true" aria-label="Quét mã QR nhân viên" onMouseDown={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Đóng"><X /></button>
        <span className="modal-icon"><QrCode /></span>
        <h2>Quét QR nhân viên</h2>
        <p>Quét mã trên thẻ nhân viên để tự động điền mã đăng nhập.</p>
        <div className="qr-camera">
          <video ref={videoRef} muted playsInline/>
          <span className="qr-scan-frame"><i /><i /><i /><i /><ScanLine /></span>
        </div>
        <div className="qr-camera-message"><Camera /> {message}</div>
        <div className="qr-manual">
          <span>Nhập nội dung QR khi không dùng được camera</span>
          <div>
            <input value={manualValue} onChange={(event) => setManualValue(event.target.value)} placeholder="Ví dụ: NBC012345"/>
            <button type="button" disabled={!manualValue.trim()} onClick={useManualValue}>Sử dụng mã</button>
          </div>
        </div>
      </section>
    </div>);
}
