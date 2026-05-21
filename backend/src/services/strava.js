import axios from 'axios';

const STRAVA_BASE = 'https://www.strava.com';

export function getAuthUrl() {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const redirectUri = process.env.STRAVA_REDIRECT_URI || 'http://localhost:3000/api/auth/callback';
  const scope = 'activity:read_all';
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope,
    approval_prompt: 'auto',
  });
  return `${STRAVA_BASE}/oauth/authorize?${params.toString()}`;
}

export async function exchangeCode(code) {
  const response = await axios.post(`${STRAVA_BASE}/oauth/token`, {
    client_id: process.env.STRAVA_CLIENT_ID,
    client_secret: process.env.STRAVA_CLIENT_SECRET,
    code,
    grant_type: 'authorization_code',
  });
  return response.data;
}

export async function refreshToken(token) {
  const response = await axios.post(`${STRAVA_BASE}/oauth/token`, {
    client_id: process.env.STRAVA_CLIENT_ID,
    client_secret: process.env.STRAVA_CLIENT_SECRET,
    refresh_token: token,
    grant_type: 'refresh_token',
  });
  return response.data;
}

export async function getAthlete(accessToken) {
  const response = await axios.get(`${STRAVA_BASE}/api/v3/athlete`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.data;
}

export async function getActivities(accessToken, page = 1, perPage = 50) {
  const response = await axios.get(`${STRAVA_BASE}/api/v3/athlete/activities`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: { page, per_page: perPage, include_all_efforts: false },
  });
  return response.data;
}

export async function getActivity(accessToken, activityId) {
  const response = await axios.get(`${STRAVA_BASE}/api/v3/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.data;
}
