import type { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
  email?: string;
  accessToken: string;
}

export interface AuthenticatedRequest extends Request {
  authUser: AuthenticatedUser;
}
