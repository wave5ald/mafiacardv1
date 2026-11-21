/** Shared room-code rules. The generator, the join validation and the UI all agree on these. */
export const ROOM_CODE_LENGTH = 5;
/** Ambiguous characters (I, O, 0, 1) are intentionally excluded. */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
  }
  return code;
}

export function normalizeRoomCode(raw: string): string {
  return (raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

export function isValidRoomCode(raw: string): boolean {
  const code = normalizeRoomCode(raw);
  return (
    code.length === ROOM_CODE_LENGTH &&
    [...code].every((character) => ROOM_CODE_ALPHABET.includes(character))
  );
}

/**
 * Accepts either a bare code or a shared invite link
 * (https://host/?room=K7M4P) and returns the code it contains.
 */
export function extractRoomCodeFromInput(raw: string): { code: string; wasLink: boolean } {
  const text = (raw ?? '').trim();
  const wasLink =
    /^[a-z][a-z0-9+.-]*:\/\//i.test(text) ||
    text.includes('?room=') ||
    text.includes('&room=');

  const fromQuery = text.match(/[?&]room=([A-Za-z0-9]{1,10})/);
  if (fromQuery) {
    return {
      code: normalizeRoomCode(fromQuery[1]).slice(0, ROOM_CODE_LENGTH),
      wasLink: true,
    };
  }

  if (wasLink) {
    const fromPath = text.match(/\/([A-Za-z0-9]{5})\/?$/);
    return { code: fromPath ? normalizeRoomCode(fromPath[1]) : '', wasLink: true };
  }

  return { code: normalizeRoomCode(text).slice(0, ROOM_CODE_LENGTH), wasLink: false };
}
