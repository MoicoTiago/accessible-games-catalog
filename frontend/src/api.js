// export const API_URL = "http://localhost:5000/api";
const API_URL = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";

export const registerUser = async (username, email, password) => {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });
  if (!res.ok) throw new Error((await res.json()).message || 'Registration failed');
  return res.json();
};

export const loginUser = async (identifier, password) => {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password }),
  });
  if (!res.ok) throw new Error((await res.json()).message || 'Login failed');
  return res.json();
};

export const fetchCurrentUser = async () => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error((await res.json()).message || 'Failed to load profile');
  return res.json();
};

export const fetchTagGroups = async () => {
  const res = await fetch(`${API_URL}/tag-groups`);
  if (!res.ok) throw new Error("Unable to load tag groups");
  return res.json();
};

export const fetchGames = async () => {
  const res = await fetch(`${API_URL}/games`);
  if (!res.ok) throw new Error("Unable to load games");
  return res.json();
};

export const searchGames = async ({ q = "", tags = [] } = {}) => {
  const params = new URLSearchParams();
  if (q && q.trim()) params.set("q", q.trim());
  if (Array.isArray(tags) && tags.length > 0) params.set("tags", tags.join(","));
  const url = `${API_URL}/games/search${params.toString() ? `?${params.toString()}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Unable to search games");
  return res.json();
};

export async function getGame(id) {
    const res = await fetch(`${API_URL}/games/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch game ${id}: ${res.status} ${res.statusText}`);
    return res.json();
}

export async function createReviewForGame(gameId, data) {
  const res = await fetch(`${API_URL}/games/${gameId}/reviews`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(data), // { rating, comment }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to submit review");
  }

  return res.json();
}


export function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getReviewsForGame(gameId) {
  const res = await fetch(`${API_URL}/games/${gameId}/reviews`);
  if (!res.ok) {
    throw new Error("Failed to fetch reviews");
  }
  return res.json(); // array of reviews with .user field
}


export async function getGames() {
    const res = await fetch(`${API_URL}/games`);
    if (!res.ok) throw new Error(`Failed to fetch games: ${res.status} ${res.statusText}`);
    return res.json();
}

export async function fetchUserReviews(userId) {
  const res = await fetch(`${API_URL}/users/${userId}/reviews`, {
    headers: {
      ...authHeaders()
    }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to load user reviews');
  }
  return res.json();
}
// Get accessibility preferences for a user
export async function getAccessibilityPreferences(userId) {
  const res = await fetch(`${API_URL}/users/${userId}/accessibility-preferences`, {
    headers: { ...authHeaders() }
  });
  if (!res.ok) throw new Error((await res.json()).message || 'Failed to load accessibility preferences');
  return res.json();
}

export async function updateAccessibilityPreferences(userId, prefs) {
  const res = await fetch(`${API_URL}/users/${userId}/accessibility-preferences`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(prefs)
  });
  if (!res.ok) throw new Error((await res.json()).message || 'Failed to update accessibility preferences');
  return res.json();
}

export async function followGame(userId, gameId) {
  const res = await fetch(`${API_URL}/users/${userId}/follow/${gameId}`, {
    method: 'POST',
    headers: { ...authHeaders() }
  });
  if (!res.ok) throw new Error((await res.json()).message || 'Failed to follow');
  return res.json();
}

export async function unfollowGame(userId, gameId) {
  const res = await fetch(`${API_URL}/users/${userId}/follow/${gameId}`, {
    method: 'DELETE',
    headers: { ...authHeaders() }
  });
  if (!res.ok) throw new Error((await res.json()).message || 'Failed to unfollow');
  return res.json();
}

export async function getFollowedGames(userId) {
  const res = await fetch(`${API_URL}/users/${userId}/followed-games`, {
    headers: { ...authHeaders() }
  });
  if (!res.ok) throw new Error((await res.json()).message || 'Failed to load followed games');
  return res.json();
}

export async function updateUserProfile(userId, data) {
  const res = await fetch(`${API_URL}/users/${userId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to update profile');
  return res.json();
}

export async function changeUserPassword(userId, currentPassword, newPassword) {
  const res = await fetch(`${API_URL}/users/${userId}/password`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ currentPassword, newPassword })
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to change password');
  return res.json();
}

export async function reportGame(gameId, message) {
  const res = await fetch(`${API_URL}/games/${gameId}/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({ message }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to submit report');
  }

  // Backend returns only a status code (201) and a non-JSON body string ("Created").
  // Do not attempt to parse JSON here; just return a simple success indicator.
  return { ok: true, status: res.status };
}

export async function getGameReports() {
  const res = await fetch(`${API_URL}/games/reports`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to load reports');
  }
  return res.json();
}

export async function resolveGameReport(id) {
  const res = await fetch(`${API_URL}/games/reports/${id}`, {
    method: 'PATCH',
    headers: { ...authHeaders() },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to resolve report');
  }
  return { ok: true, status: res.status };
}

export async function deleteGame(id) {
  const res = await fetch(`${API_URL}/games/${id}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to delete game');
  }
  return { ok: true, status: res.status };
}

export async function voteOnReview(reviewId, value) {
  const res = await fetch(`${API_URL}/games/reviews/${reviewId}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ value })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to vote');
  }
  return res.json();
}

export async function getHelpfulVotes(userId) {
  const res = await fetch(`${API_URL}/users/${userId}/helpful-votes`, {
    headers: { ...authHeaders() }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to load helpful votes');
  }
  return res.json();
}
