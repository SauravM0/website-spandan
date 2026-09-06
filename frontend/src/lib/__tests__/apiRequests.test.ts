import { afterEach, describe, expect, it, vi } from 'vitest';

describe('API request coordination', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('shares an in-flight administrator GET between simultaneous callers', async () => {
    let finishRequest: ((response: Response) => void) | undefined;
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          finishRequest = resolve;
        })
    );
    vi.stubGlobal('fetch', fetchMock);

    const { getAdminDashboard } = await import('../api');
    const first = getAdminDashboard();
    const second = getAdminDashboard();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    finishRequest?.(
      new Response(JSON.stringify({ dashboard: { appointments: [] } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await expect(first).resolves.toEqual({ dashboard: { appointments: [] } });
    await expect(second).resolves.toEqual({ dashboard: { appointments: [] } });
  });
});
