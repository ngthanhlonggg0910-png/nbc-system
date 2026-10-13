export function notificationError(
  message,
  statusCode = 400,
  code = "NOTIFICATION_ERROR",
) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}
