import React, { useState, useEffect, useRef } from "react";
import { QrCode, ScanLine, Camera, X, CheckCircle2, AlertCircle, Monitor } from "lucide-react";
import { postData } from "../../utils/api";

function parseUserAgent(ua) {
    if (!ua) return "Thiết bị không xác định";
    let os = "Thiết bị không xác định";
    let browser = "Trình duyệt không xác định";

    if (ua.includes("Windows")) os = "Windows";
    else if (ua.includes("Macintosh") || ua.includes("Mac OS")) os = "macOS";
    else if (ua.includes("Linux")) os = "Linux";
    else if (ua.includes("Android")) os = "Android";
    else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

    if (ua.includes("Edg/")) browser = "Edge";
    else if (ua.includes("Chrome/")) browser = "Chrome";
    else if (ua.includes("Safari/") && !ua.includes("Chrome")) browser = "Safari";
    else if (ua.includes("Firefox/")) browser = "Firefox";

    return `${browser} trên ${os}`;
}

export function ScanLoginQr({ onClose }) {
    const videoRef = useRef(null);
    const streamRef = useRef(undefined);
    const [manualValue, setManualValue] = useState("");
    const [message, setMessage] = useState("Đang mở camera...");
    const [scanning, setScanning] = useState(true);
    const [sessionId, setSessionId] = useState(null);
    const [deviceInfo, setDeviceInfo] = useState(null);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const startCamera = (detector) => {
        let stopped = false;
        let frame = 0;

        navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false }).then(async (stream) => {
            if (stopped) {
                stream.getTracks().forEach((track) => track.stop());
                return;
            }
            streamRef.current = stream;
            if (!videoRef.current) return;
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
            setMessage("Đưa mã QR đăng nhập trên máy tính vào giữa khung hình");

            const scanFrame = async () => {
                if (stopped || !videoRef.current) return;
                try {
                    const results = await detector.detect(videoRef.current);
                    if (results[0]) {
                        const val = results[0].rawValue;
                        try {
                            const parsed = JSON.parse(val);
                            if (parsed.type === "qr-login" && parsed.sessionId) {
                                stopped = true;
                                stream.getTracks().forEach((track) => track.stop());
                                handleScanned(parsed.sessionId);
                                return;
                            }
                        } catch {
                            // Không phải JSON hợp lệ hoặc không đúng format, tiếp tục quét
                        }
                    }
                } catch {
                    // Tiếp tục quét khung hình tiếp theo
                }
                frame = requestAnimationFrame(scanFrame);
            };
            frame = requestAnimationFrame(scanFrame);
        }).catch(() => setMessage("Không thể mở camera. Hãy cấp quyền camera hoặc nhập nội dung QR ở bên dưới."));

        return () => {
            stopped = true;
            cancelAnimationFrame(frame);
            streamRef.current?.getTracks().forEach((track) => track.stop());
        };
    };

    useEffect(() => {
        if (!scanning) return;

        const DetectorApi = window.BarcodeDetector;
        if (!DetectorApi || !navigator.mediaDevices?.getUserMedia) {
            setMessage("Thiết bị chưa hỗ trợ quét trực tiếp. Bạn có thể nhập nội dung QR ở bên dưới.");
            return;
        }

        const detector = new DetectorApi({ formats: ["qr_code"] });
        const cleanup = startCamera(detector);

        return cleanup;
    }, [scanning]);

    const handleScanned = async (sid) => {
        try {
            setError("");
            setScanning(false);
            const response = await postData("/api/user/qr/scan", { sessionId: sid });
            setSessionId(sid);
            setDeviceInfo(parseUserAgent(response.data.desktopUserAgent));
        } catch (err) {
            setError(err.response?.data?.message || "Mã QR hết hạn hoặc không hợp lệ");
        }
    };

    const handleConfirm = async () => {
        try {
            setError("");
            await postData("/api/user/qr/confirm", { sessionId });
            setSuccessMessage("Đăng nhập thành công trên thiết bị khác!");
            setTimeout(onClose, 2000);
        } catch (err) {
            setError(err.response?.data?.message || "Xác nhận thất bại");
        }
    };

    const handleCancel = async () => {
        try {
            setError("");
            await postData("/api/user/qr/cancel", { sessionId });
            setSuccessMessage("Đã hủy yêu cầu đăng nhập.");
            setTimeout(onClose, 2000);
        } catch (err) {
            setError(err.response?.data?.message || "Hủy thất bại");
        }
    };

    const handleRetry = () => {
        setError("");
        setSessionId(null);
        setDeviceInfo(null);
        setScanning(true);
    };

    const useManualValue = () => {
        try {
            const parsed = JSON.parse(manualValue);
            if (parsed.type === "qr-login" && parsed.sessionId) {
                handleScanned(parsed.sessionId);
            } else {
                setMessage("Nội dung QR không đúng định dạng đăng nhập.");
            }
        } catch {
            // Thử dùng trực tiếp chuỗi nhập vào làm sessionId
            if (manualValue.trim()) {
                handleScanned(manualValue.trim());
            } else {
                setMessage("Vui lòng nhập nội dung QR hợp lệ.");
            }
        }
    };

    return (
        <div className="modal-backdrop qr-login-backdrop" onMouseDown={onClose}>
            <section className="qr-login-modal" role="dialog" aria-modal="true" aria-label="Đăng nhập thiết bị khác" onMouseDown={(event) => event.stopPropagation()} style={{ maxWidth: "450px" }}>
                <button className="modal-close" onClick={onClose} aria-label="Đóng"><X /></button>
                <span className="modal-icon"><QrCode /></span>
                <h2>Đăng nhập thiết bị khác</h2>

                {successMessage ? (
                    <div style={{ textAlign: "center", padding: "20px 0" }}>
                        <CheckCircle2 size={64} style={{ color: "#10b981", margin: "0 auto 15px" }} />
                        <h3>{successMessage}</h3>
                    </div>
                ) : error ? (
                    <div style={{ textAlign: "center", padding: "20px 0" }}>
                        <AlertCircle size={64} style={{ color: "#ef4444", margin: "0 auto 15px" }} />
                        <p style={{ color: "#ef4444", marginBottom: "15px" }}>{error}</p>
                        <button className="primary-button" onClick={handleRetry} style={{ margin: "0 auto" }}>Quét lại</button>
                    </div>
                ) : scanning ? (
                    <>
                        <p>Quét mã QR hiển thị trên màn hình máy tính để đăng nhập.</p>
                        <div className="qr-camera">
                            <video ref={videoRef} muted playsInline />
                            <span className="qr-scan-frame"><i /><i /><i /><i /><ScanLine /></span>
                        </div>
                        <div className="qr-camera-message"><Camera /> {message}</div>
                        <div className="qr-manual">
                            <span>Nhập nội dung QR khi không dùng được camera</span>
                            <div>
                                <input value={manualValue} onChange={(event) => setManualValue(event.target.value)} placeholder="Nhập mã session hoặc JSON" />
                                <button type="button" disabled={!manualValue.trim()} onClick={useManualValue}>Sử dụng</button>
                            </div>
                        </div>
                    </>
                ) : deviceInfo ? (
                    <div style={{ textAlign: "center", padding: "10px 0" }}>
                        <Monitor size={48} style={{ color: "#075bae", margin: "0 auto 15px" }} />
                        <p>Yêu cầu đăng nhập từ thiết bị:</p>
                        <strong style={{ display: "block", fontSize: "1.1rem", margin: "5px 0 20px" }}>{deviceInfo}</strong>
                        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                            <button className="primary-button" onClick={handleConfirm} style={{ flex: 1 }}>Xác nhận đăng nhập</button>
                            <button className="secondary-button" onClick={handleCancel} style={{ flex: 1, border: "1px solid #ef4444", color: "#ef4444" }}>Hủy yêu cầu</button>
                        </div>
                    </div>
                ) : (
                    <div style={{ textAlign: "center", padding: "20px 0" }}>
                        <p>Đang tải thông tin thiết bị...</p>
                    </div>
                )}
            </section>
        </div>
    );
}
