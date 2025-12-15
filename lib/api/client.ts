import { getAccessToken, setAccessToken } from "../auth/token-store";

const API_BASE_URL = "http://localhost:5000/api";

export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = getAccessToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` })
  };

  let response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAccessToken()}`
        }
      });
    }
  }

  return response;
};

export const refreshAccessToken = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/refresh-token`, {
      method: "POST",
      credentials: "include",
    });

    if (!res.ok) return false;

    const data = await res.json();
    setAccessToken(data.accessToken);

    return true;
  } catch {
    return false;
  }
};
