export function normalizeRole(role) {
  const normalizedRole = String(role || '').trim().toLowerCase();

  if (['admin', 'administrator'].includes(normalizedRole)) return 'admin';
  if (normalizedRole === 'pembimbing') return 'pembimbing';
  if (['pemagang', 'peserta', 'calon pemagang'].includes(normalizedRole)) {
    return 'pemagang';
  }

  return normalizedRole;
}

export function getStoredUser() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    return user && typeof user === 'object' ? user : null;
  } catch {
    return null;
  }
}

export function getLoginData(responseData) {
  const data = responseData?.data || responseData || {};

  return {
    token: data.token || data.access_token,
    user: data.user || responseData?.user || null,
  };
}

export function getRoleHome(role) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === 'admin') return '/admin';
  if (normalizedRole === 'pemagang') return '/absensi';
  if (normalizedRole === 'pembimbing') return '/pembimbing';

  return '/';
}
