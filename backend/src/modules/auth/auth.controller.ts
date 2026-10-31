import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import {
  customerRegisterSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.validation';
import { env } from '../../config/env';

const REFRESH_COOKIE_NAME = 'refreshToken';

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  path: `${env.API_PREFIX}/auth`,
};

export class AuthController {
  /**
   * POST /api/v1/auth/register
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = customerRegisterSchema.parse(req.body);
      const result = await authService.registerCustomer(validated);

      // Set rotating refresh token in secure HttpOnly cookie
      res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, REFRESH_COOKIE_OPTIONS);

      res.status(201).json({
        success: true,
        message: 'Customer account registered successfully',
        data: {
          user: result.user,
          accessToken: result.accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/login
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = loginSchema.parse(req.body);
      const result = await authService.login(validated);

      res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, REFRESH_COOKIE_OPTIONS);

      res.status(200).json({
        success: true,
        message: 'Authenticated successfully',
        data: {
          user: result.user,
          accessToken: result.accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/refresh
   */
  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const oldRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;
      const result = await authService.refreshSession(oldRefreshToken);

      res.cookie(REFRESH_COOKIE_NAME, result.newRefreshToken, REFRESH_COOKIE_OPTIONS);

      res.status(200).json({
        success: true,
        message: 'Session token refreshed successfully',
        data: {
          user: result.user,
          accessToken: result.accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/logout
   */
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;
      await authService.logout(refreshToken);

      res.clearCookie(REFRESH_COOKIE_NAME, {
        ...REFRESH_COOKIE_OPTIONS,
        maxAge: 0,
      });

      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/forgot-password
   */
  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = forgotPasswordSchema.parse(req.body);
      const result = await authService.forgotPassword(validated.email);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/reset-password
   */
  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = resetPasswordSchema.parse(req.body);
      const result = await authService.resetPassword(validated);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/auth/me
   */
  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const me = await authService.getMe(userId);

      res.status(200).json({
        success: true,
        data: me,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
