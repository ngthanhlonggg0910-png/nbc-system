import jwt from "jsonwebtoken";

export const sendToken = (user, statusCode, message, res) => {
  const configuredJwtExpiry = String(process.env.JWT_EXPIRES_IN ?? "7d").trim();
  const jwtExpiresIn = /^\d+$/.test(configuredJwtExpiry)
    ? `${Math.max(Number.parseInt(configuredJwtExpiry, 10), 7)}d`
    : /^[1-9]\d*(s|m|h|d|w|y)$/i.test(configuredJwtExpiry)
      ? configuredJwtExpiry
      : "7d";
  const configuredCookieDays = Number.parseInt(
    process.env.COOKIE_EXPIRES_IN ?? "7",
    10,
  );
  const cookieDays =
    Number.isFinite(configuredCookieDays) && configuredCookieDays > 0
      ? configuredCookieDays
      : 7;
  const token = jwt.sign(
    { staff_id: user.staff_id, role: user.role },
    process.env.JWT_SECRET_KEY,
    {
      expiresIn: jwtExpiresIn,
    },
  );
  console.log("TOKEN:", token);
  res
    .status(statusCode)
    .cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: cookieDays * 24 * 60 * 60 * 1000,
    })
    .json({
      success: true,
      user,
      token,
      message,
    });
};
