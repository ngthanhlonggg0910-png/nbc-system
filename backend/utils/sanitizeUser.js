export function sanitizeUser(user) {
    if (!user) return null;

    const {
        password_hash,
        failed_login_attempts,
        locked_until,
        ...safeUser
    } = user;

    return safeUser;
}