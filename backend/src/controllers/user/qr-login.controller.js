import * as qrLoginService from "../../services/user/qr-login.service.js";

export const generate = async (req, res, next) => {
    try {
        const session = await qrLoginService.generateQR(req.ip, req.headers["user-agent"] || "");
        res.status(200).json(session);
    } catch (err) { next(err); }
};

export const scan = async (req, res, next) => {
    try {
        const result = await qrLoginService.scanQR(req.body.sessionId, req.user.staff_id, req.ip);
        res.status(200).json(result);
    } catch (err) { next(err); }
};

export const confirm = async (req, res, next) => {
    try {
        const result = await qrLoginService.confirmQR(req.body.sessionId, req.user.staff_id);
        res.status(200).json(result);
    } catch (err) { next(err); }
};

export const cancel = async (req, res, next) => {
    try {
        const result = await qrLoginService.cancelQR(req.body.sessionId, req.user.staff_id);
        res.status(200).json(result);
    } catch (err) { next(err); }
};

export const poll = async (req, res, next) => {
    try {
        const result = await qrLoginService.pollQR(req.params.sessionId, req.ip, req.headers["user-agent"] || "");
        if (result.status === "confirmed") {
            res.cookie("token", result.accessToken, {
                httpOnly: true,
                maxAge: 30 * 24 * 60 * 60 * 1000,
            });
            res.status(200).json({ success: true, status: "confirmed", accessToken: result.accessToken, refreshToken: result.refreshToken, user: result.user });
        } else {
            res.status(200).json(result);
        }
    } catch (err) { next(err); }
};
