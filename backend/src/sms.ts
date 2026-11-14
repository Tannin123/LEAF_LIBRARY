type EotpResponse = {
  ok?: boolean;
  error?: string;
  request_id?: string;
  expires_in?: number;
  verified?: boolean;
};

export class OtpProviderError extends Error {
  constructor(message: string, readonly providerError?: string) {
    super(message);
  }
}

const EOTP_API_BASE = 'https://eotp.com.vn/api/v1';

function getCredentials(): { apiKey: string; apiSecret: string } | null {
  const apiKey = process.env.EOTP_API_KEY?.trim() ?? '';
  const apiSecret = process.env.EOTP_API_SECRET?.trim() ?? '';
  if (!apiKey && !apiSecret) return null;
  if (!apiKey || !apiSecret) throw new OtpProviderError('Both eOTP API credentials are required');
  return { apiKey, apiSecret };
}

export function isOtpProviderConfigured(): boolean {
  return getCredentials() !== null;
}

async function requestEotp(path: string, body: Record<string, unknown>): Promise<EotpResponse> {
  const credentials = getCredentials();
  if (!credentials) throw new OtpProviderError('eOTP is not configured');

  let response: Response;
  try {
    response = await fetch(`${EOTP_API_BASE}${path}`, {
      method: 'POST',
      headers: {
        'X-Api-Key': credentials.apiKey,
        'X-Api-Secret': credentials.apiSecret,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      // eOTP can send an SMS fallback synchronously; its docs require at least 35 seconds.
      signal: AbortSignal.timeout(40_000)
    });
  } catch {
    throw new OtpProviderError('Could not reach eOTP');
  }

  let payload: EotpResponse = {};
  try { payload = await response.json() as EotpResponse; } catch { /* handled below */ }
  if (!response.ok || payload.ok !== true) {
    throw new OtpProviderError(`eOTP request failed (HTTP ${response.status})`, payload.error);
  }
  return payload;
}

export async function sendPasswordResetOtp(phone: string): Promise<{ requestId: string; expiresIn: number }> {
  const payload = await requestEotp('/otp/send', { phone, country_code: '84', channel: 'sms' });
  if (!payload.request_id) throw new OtpProviderError('eOTP did not return a request ID');
  const expiresIn = Number(payload.expires_in ?? 300);
  return {
    requestId: payload.request_id,
    expiresIn: Number.isInteger(expiresIn) && expiresIn >= 60 && expiresIn <= 900 ? expiresIn : 300
  };
}

export async function verifyPasswordResetOtp(requestId: string, phone: string, code: string): Promise<'verified' | 'invalid' | 'expired'> {
  try {
    const payload = await requestEotp('/otp/verify', { request_id: requestId, phone, country_code: '84', code });
    return payload.verified === true ? 'verified' : 'invalid';
  } catch (error) {
    if (error instanceof OtpProviderError && error.providerError === 'wrong_code') return 'invalid';
    if (error instanceof OtpProviderError && ['expired', 'too_many_attempts'].includes(error.providerError ?? '')) return 'expired';
    throw error;
  }
}
