import { useEffect, useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, RefreshCw, CheckCircle2, AlertCircle, Copy } from "lucide-react";
import { postData, getData } from "../../utils/api";

export function QrCrossDeviceLogin({ onLogin, remember }) {
    const [sessionId, setSessionId] = useState(null);
    const [status, setStatus] = useState("pending"); // pending, scanned, confirmed, expired
    const [timeLeft, setTimeLeft] = useState(90);
    const [error, setError] = useState("");
    const [copyMessage, setCopyMessage] = useState("");

    const pollIntervalRef = useRef(null);
    const timerIntervalRef = useRef(null);

    const generateSession = async () => {
        try {
            setError("");
            setCopyMessage("");
            setStatus("pending");
            setSessionId(null);

            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

            const response = await postData("/api/user/qr/generate");
            const { id: newSessionId, expiresAt } = response.data;

            setSessionId(newSessionId);

            const expiresTime = new Date(expiresAt).getTime();
            const calculateTimeLeft = () => {
                const diff = Math.max(0, Math.round((expiresTime - Date.now()) / 1000));
                setTimeLeft(diff);
                if (diff <= 0) {
                    setStatus("expired");
                    clearInterval(pollIntervalRef.current);
                    clearInterval(timerIntervalRef.current);
                }
            };

            calculateTimeLeft();
            timerIntervalRef.current = setInterval(calculateTimeLeft, 1000);
            startPolling(newSessionId);
        } catch (err) {
            setError("Không thể tạo mã QR đăng nhập. Vui lòng thử lại.");
        }
    };

    const startPolling = (sid) => {
        pollIntervalRef.current = setInterval(async () => {
            try {
                const response = await getData(`/api/user/qr/poll/${sid}`);
                const { status: newStatus, accessToken, refreshToken, user } = response.data;

                if (newStatus === "scanned") {
                    setStatus("scanned");
                } else if (newStatus === "confirmed") {
                    setStatus("confirmed");
                    clearInterval(pollIntervalRef.current);
                    clearInterval(timerIntervalRef.current);

                    localStorage.setItem("nbc-access-token", accessToken);
                    localStorage.setItem("nbc-refresh-token", refreshToken);
                    onLogin(user.staff_id, remember, null, user.role);
                } else if (newStatus === "expired") {
                    setStatus("expired");
                    clearInterval(pollIntervalRef.current);
                    clearInterval(timerIntervalRef.current);
                }
            } catch (err) {
                console.error(err);
            }
        }, 2000);
    };

    useEffect(() => {
        generateSession();
        return () => {
            clearInterval(pollIntervalRef.current);
            clearInterval(timerIntervalRef.current);
        };
    }, []);

    useEffect(() => {
        if (status === "expired") generateSession();
    }, [status]);

    const qrValue = sessionId ? JSON.stringify({ type: "qr-login", sessionId }) : "";

    return (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
            {error ? (
                <div style={{ color: "#ef4444" }}>
                    <AlertCircle size={48} style={{ margin: "0 auto 10px" }} />
                    <p>{error}</p>
                    <button onClick={generateSession}>Thử lại</button>
                </div>
            ) : status === "pending" ? (
                <div>
                    <div style={{ background: "#fff", padding: "15px", borderRadius: "12px", display: "inline-block" }}>
                        {qrValue ? <QRCodeSVG value={qrValue} size={200} /> : <RefreshCw className="animate-spin" />}
                    </div>
                    <p>Quét mã QR bằng ứng dụng trên điện thoại để đăng nhập</p>
                    <p>Mã tự động đổi sau {timeLeft}s</p>
                </div>
            ) : status === "scanned" ? (
                <div>
                    <CheckCircle2 size={64} style={{ color: "#10b981", margin: "0 auto 15px" }} />
                    <h3>Đã quét thành công!</h3>
                    <p>Xác nhận đăng nhập trên điện thoại của bạn.</p>
                </div>
            ) : status === "confirmed" ? (
                <div>
                    <CheckCircle2 size={64} style={{ color: "#10b981", margin: "0 auto 15px" }} />
                    <h3>Đăng nhập thành công</h3>
                </div>
            ) : null}
        </div>
    );
}
