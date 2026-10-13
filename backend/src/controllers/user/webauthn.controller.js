import * as webauthnService from "../../services/user/webauthn.service.js";

const getRpId = (req) => {
    if (req.headers.origin) {
        try { return new URL(req.headers.origin).hostname; } catch (e) { }
    }
    return req.hostname || 'localhost';
};

const getExpectedOrigin = (req) => req.headers.origin || `${req.protocol}://${req.get('host')}`;

export const registerChallenge = async (req, res, next) => {
    try {
        const result = await webauthnService.generateRegOptions(req.user.staff_id, getRpId(req));
        res.status(200).json(result);
    } catch (err) { next(err); }
};

export const registerVerify = async (req, res, next) => {
    try {
        const { credential, challengeToken, deviceName } = req.body;
        const saved = await webauthnService.verifyReg(
            credential, challengeToken, deviceName, req.user.staff_id,
            getExpectedOrigin(req), getRpId(req), req.headers["user-agent"]
        );
        res.status(200).json({ success: true, credential: { id: saved.id, deviceName: saved.deviceName } });
    } catch (err) { next(err); }
};

export const loginChallenge = async (req, res, next) => {
    try {
        const result = await webauthnService.generateAuthOptions(req.body.identifier, getRpId(req));
        res.status(200).json(result);
    } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

export const loginVerify = async (req, res, next) => {
    try {
        const { credential, challengeToken } = req.body;
        await webauthnService.verifyAuth(credential, challengeToken, getExpectedOrigin(req), getRpId(req), res);
    } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};
