import jwt from "jsonwebtoken";

export function signChallenge(payload) {
    const { exp, ...rest } = payload;
    return jwt.sign(rest, process.env.JWT_SECRET_KEY, { expiresIn: "60s" });
}

export function verifyChallenge(token) {
    try {
        return jwt.verify(token, process.env.JWT_SECRET_KEY);
    } catch {
        return null;
    }
}
