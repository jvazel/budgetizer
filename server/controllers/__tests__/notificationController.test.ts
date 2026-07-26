import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendTestNotification, getVapidPublicKey } from '../notificationController';
import { sendPushNotification } from '../../utils/pushNotification';

vi.mock('../../utils/pushNotification', () => ({
  sendPushNotification: vi.fn(),
}));

describe('notificationController', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('returns 403 Forbidden when sendTestNotification is called in production environment', async () => {
    process.env.NODE_ENV = 'production';

    const req = { user: { id: 'user1' } } as unknown as AppRequest;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as AppResponse;

    await sendTestNotification(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('environnement de production') })
    );
    expect(sendPushNotification).not.toHaveBeenCalled();
  });

  it('triggers push notification when sendTestNotification is called in development environment', async () => {
    process.env.NODE_ENV = 'development';

    const req = { user: { id: 'user1' } } as unknown as AppRequest;
    const res = {
      json: vi.fn(),
    } as unknown as AppResponse;

    await sendTestNotification(req, res);

    expect(sendPushNotification).toHaveBeenCalledWith('user1', expect.objectContaining({
      title: expect.stringContaining('Budgetizer Test'),
    }));
    expect(res.json).toHaveBeenCalledWith({ message: 'Test notification triggered' });
  });

  it('returns VAPID public key when configured', async () => {
    process.env.VAPID_PUBLIC_KEY = 'test_vapid_key';

    const req = {} as AppRequest;
    const res = {
      json: vi.fn(),
    } as unknown as AppResponse;

    await getVapidPublicKey(req, res);

    expect(res.json).toHaveBeenCalledWith({ publicKey: 'test_vapid_key' });
  });
});
