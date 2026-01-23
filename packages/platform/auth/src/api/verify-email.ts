/**
 * Auth API Endpoints
 * 
 * Backend API handlers for authentication flows
 */

import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'hololand-secret-key-change-in-production';

interface VerifyEmailRequest {
  token: string;
}

interface VerifyEmailResponse {
  success: boolean;
  accessToken?: string;
  user?: {
    id: string;
    email: string;
    displayName: string;
  };
  message?: string;
}

/**
 * Verify email token and return access token
 * POST /api/auth/verify-email
 */
export async function verifyEmailHandler(
  req: Request<{}, VerifyEmailResponse, VerifyEmailRequest>,
  res: Response<VerifyEmailResponse>
) {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required',
      });
    }

    // Decode and verify the email verification token
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
      type: string;
    };

    // Ensure it's an email verification token
    if (decoded.type !== 'email_verification') {
      return res.status(400).json({
        success: false,
        message: 'Invalid token type',
      });
    }

    // TODO: Mark user as verified in database
    // await db.users.update({
    //   where: { id: decoded.userId },
    //   data: { emailVerified: true, verifiedAt: new Date() }
    // });

    // Generate access token for the verified user
    const accessToken = jwt.sign(
      {
        userId: decoded.userId,
        email: decoded.email,
        verified: true,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      accessToken,
      user: {
        id: decoded.userId,
        email: decoded.email,
        displayName: decoded.email.split('@')[0], // Default display name
      },
    });

  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(400).json({
        success: false,
        message: 'Verification link has expired. Please request a new one.',
      });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification link.',
      });
    }

    console.error('Email verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred during verification.',
    });
  }
}

/**
 * Generate email verification token (for signup flow)
 */
export function generateVerificationToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email, type: 'email_verification' },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

/**
 * Send verification email (placeholder - integrate with email provider)
 */
export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const verifyUrl = `${process.env.APP_URL || 'https://hololand.io'}/verify-email?token=${token}`;
  
  // TODO: Integrate with email provider (SendGrid, Resend, etc.)
  console.log(`[Email] Sending verification email to ${email}`);
  console.log(`[Email] Verify URL: ${verifyUrl}`);
  
  // Example with SendGrid:
  // await sgMail.send({
  //   to: email,
  //   from: 'noreply@hololand.io',
  //   subject: 'Welcome to Hololand - Verify Your Email',
  //   html: `
  //     <h1>Welcome to Hololand!</h1>
  //     <p>Click the link below to verify your email and enter the Oasis:</p>
  //     <a href="${verifyUrl}">Enter Hololand</a>
  //   `,
  // });
}

/**
 * Express router setup
 */
export function setupAuthRoutes(app: any) {
  app.post('/api/auth/verify-email', verifyEmailHandler);
}
