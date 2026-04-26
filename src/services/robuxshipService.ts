import axios from 'axios';

const ROBUXSHIP_BASE_URL = process.env.ROBUXSHIP_BASE_URL || 'https://api.robuxship.com/v1';
const ROBUXSHIP_API_KEY = process.env.ROBUXSHIP_API_KEY || '';

export interface RobuxShipValidateResult {
  success: boolean;
  valid: boolean;
  universe_id: number;
  place_id: number;
  gamepass_id: number;
  user_id: number;
  username: string;
  price: number;
  cost: number;
}

export function isRobuxShipConfigured(): boolean {
  return ROBUXSHIP_API_KEY.length > 0;
}

export async function robuxshipValidateGamepass(
  username: string,
  amount: number,
): Promise<RobuxShipValidateResult | null> {
  if (!ROBUXSHIP_API_KEY) {
    return null;
  }

  try {
    const res = await axios.post<RobuxShipValidateResult>(
      `${ROBUXSHIP_BASE_URL}/orders/validate`,
      {
        method: 'gamepass',
        amount,
        username,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'API-Key': ROBUXSHIP_API_KEY,
        },
        timeout: 15000,
      },
    );

    if (res.data?.success && res.data?.valid) {
      return res.data;
    }

    console.warn(`[robuxship] Validate returned invalid: ${JSON.stringify(res.data)}`);
    return null;
  } catch (err: unknown) {
    const axiosErr = err as import('axios').AxiosError;
    const status = axiosErr.response?.status;
    const data = axiosErr.response?.data;
    console.warn(`[robuxship] Validate failed (${status}): ${JSON.stringify(data) || (err as Error).message}`);
    return null;
  }
}
