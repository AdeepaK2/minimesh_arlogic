import { UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase/supabase.service';
import { SupabaseAuthGuard } from './supabase-auth.guard';

describe('SupabaseAuthGuard', () => {
  it('rejects missing bearer tokens', async () => {
    const guard = new SupabaseAuthGuard(createSupabaseService());

    await expect(guard.canActivate(createContext())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects invalid Supabase sessions', async () => {
    const guard = new SupabaseAuthGuard(
      createSupabaseService({
        data: { user: null },
        error: { message: 'invalid token' },
      }),
    );

    await expect(
      guard.canActivate(createContext('Bearer invalid-token')),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('attaches the authenticated user to the request', async () => {
    const request = { headers: { authorization: 'Bearer valid-token' } };
    const guard = new SupabaseAuthGuard(
      createSupabaseService({
        data: {
          user: {
            id: 'user-1',
            email: 'user@example.com',
          },
        },
        error: null,
      }),
    );

    const result = await guard.canActivate(createContext(undefined, request));

    expect(result).toBe(true);
    expect(request).toMatchObject({
      authUser: {
        id: 'user-1',
        email: 'user@example.com',
        accessToken: 'valid-token',
      },
    });
  });
});

function createSupabaseService(
  authResult: unknown = { data: { user: null }, error: null },
) {
  return {
    getClient: () => ({
      auth: {
        getUser: jest.fn(() => Promise.resolve(authResult)),
      },
    }),
  } as unknown as SupabaseService;
}

function createContext(
  authorization?: string,
  request: Record<string, unknown> = {
    headers: authorization ? { authorization } : {},
  },
) {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as never;
}
