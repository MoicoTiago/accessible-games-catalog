/**
 * Best-effort call to backend interpreter. Returns intent or null.
 * Override the base via window.VOICE_API_BASE if needed (e.g., http://localhost:5000/api).
 */
export async function interpretTranscriptRemote(raw) {
  const apiBase = window.VOICE_API_BASE || 'http://localhost:5000/api';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1200);
  try {
    const res = await window.fetch(`${apiBase}/voice/interpret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: raw }),
      signal: controller.signal
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.intent || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export default interpretTranscriptRemote;
