import { describe, expect, it } from 'vitest';
import LeadDetailPage from '../page';

describe('lead detail route', () => {
  it('unwraps the asynchronous route parameters before rendering the client', async () => {
    const element = await LeadDetailPage({
      params: Promise.resolve({ id: '6662a3a1-c392-436c-bced-deb572aca31d' }),
    });

    expect((element.props as { id: string }).id).toBe('6662a3a1-c392-436c-bced-deb572aca31d');
  });
});
