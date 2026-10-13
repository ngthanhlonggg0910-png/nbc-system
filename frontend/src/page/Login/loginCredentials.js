export function prepareLoginCredentials(staffId, password) {
  return {
    staffId: String(staffId ?? "").trim().toUpperCase(),
    password: String(password ?? ""),
  };
}

export function hasLoginCredentials(staffId, password) {
  const credentials = prepareLoginCredentials(staffId, password);

  return Boolean(credentials.staffId && credentials.password);
}
