import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { useEffect, useState } from "react";
import { postData } from "../utils/api";

export async function checkBiometricSupport() {
    if (typeof window === "undefined" || !window.PublicKeyCredential) return false;
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== "function") return false;
    try {
        return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
        return false;
    }
}

export function useBiometricLogin() {
    const [isSupported, setIsSupported] = useState(false);

    useEffect(() => {
        checkBiometricSupport().then(setIsSupported);
    }, []);

    const hasBiometricRegistered = (identifier) => {
        if (!identifier) return false;
        return localStorage.getItem(`nbc-biometric-${identifier.toUpperCase()}`) === "true";
    };

    const loginWithBiometric = async (identifier) => {
        if (!identifier) throw new Error("Vui lòng nhập mã định danh");

        // 1. Lấy challenge options từ backend
        const challengeRes = await postData("/api/user/webauthn/challenge", {
            identifier: identifier.toUpperCase(),
        });
        const { options, challengeToken } = challengeRes.data;

        // 2. Bắt đầu xác thực bằng trình duyệt
        let credential;
        try {
            credential = await startAuthentication({ optionsJSON: options });
        } catch (err) {
            if (err.name === "NotAllowedError") return null; // Người dùng hủy
            throw err;
        }

        // 3. Gửi thông tin xác thực lên backend để kiểm tra
        const verifyRes = await postData("/api/user/webauthn/verify", {
            credential,
            challengeToken,
        });

        const { token, refreshToken, user } = verifyRes.data;

        // 4. Lưu token vào localStorage
        localStorage.setItem("nbc-access-token", token);
        localStorage.setItem("nbc-refresh-token", refreshToken);

        return { user, token };
    };

    const registerBiometric = async (identifier) => {
        if (!identifier) throw new Error("Vui lòng nhập mã định danh");

        const challengeRes = await postData("/api/user/webauthn/register/challenge");
        const { options, challengeToken } = challengeRes.data;

        let credential;
        try {
            credential = await startRegistration({ optionsJSON: options });
        } catch (err) {
            if (err.name === "NotAllowedError") return null;
            throw err;
        }

        await postData("/api/user/webauthn/register/verify", {
            credential,
            challengeToken,
        });

        localStorage.setItem(`nbc-biometric-${identifier.toUpperCase()}`, "true");
        return true;
    };

    return { isSupported, hasBiometricRegistered, loginWithBiometric, registerBiometric };
}
