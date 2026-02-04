const prisma = require('../config/database');
const { generateAccessToken, refreshAccessToken } = require('../config/jwt.js');
const Joi = require('joi');
const twilio = require('twilio');
const dotenv = require('dotenv');
dotenv.config();  

// Initialize Twilio client
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);


/**
 * Send OTP via Twilio Verify
 */
const sendOTP = async (req, res) => {
  try {
    const schema = Joi.object({
      phone: Joi.string().pattern(/^\+91\d{10}$/).required().messages({
        'string.pattern.base': 'Phone must be in +91XXXXXXXXXX format',
      }),
      // Role is optional here as it might be an existing user logging in
      role: Joi.string().valid('DRIVER', 'SHIPPER', 'DISPATCHER').default('DRIVER'),
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { phone } = req.body;

    // Send verification code using Twilio Verify
    await client.verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verifications
      .create({ to: phone, channel: 'sms' });

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully via Twilio',
      data: { phone },
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send OTP',
    });
  }
};

/**
 * Verify OTP using Twilio Verify and issue JWT token
 */
const verifyOTP = async (req, res) => {
  try {
    const schema = Joi.object({
      phone: Joi.string().pattern(/^\+91\d{10}$/).required(),
      otp: Joi.string().length(6).required(),
      role: Joi.string().valid('DRIVER', 'SHIPPER', 'DISPATCHER').optional(),
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { phone, otp, role } = req.body;

    // Verify code with Twilio
    const verificationCheck = await client.verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks
      .create({ to: phone, code: otp });

    if (verificationCheck.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP',
      });
    }

    // On successful verification, find or create the user
    let user = await prisma.user.findUnique({
      where: { phone },
      include: {
        trucks: {
          select: {
            id: true,
            licensePlate: true,
            model: true,
          },
        },
      },
    });

    if (!user) {
      // Create new user if not found
      user = await prisma.user.create({
        data: {
          phone,
          role: role || 'DRIVER',
          name: `User_${phone.slice(-4)}`,
        },
        include: { trucks: true },
      });
    }

    // Generate JWT token with userId
    const token = generateAccessToken({
      userId: user.id,
      role: user.role,
    });

    // Update last active
    await prisma.user.update({
      where: { id: user.id },
      data: { lastActiveDate: new Date() },
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          role: user.role,
          status: user.status,
          rating: user.rating,
          deliveriesCount: user.deliveriesCount,
          totalEarnings: user.totalEarnings,
          weeklyEarnings: user.weeklyEarnings,
          trucks: user.trucks || [],
        },
      },
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'OTP verification failed',
    });
  }
};

/**
 * GET /api/auth/profile - Get authenticated user profile (PROTECTED)
 */
const getProfile = async (req, res) => {
  try {
    // req.user is attached by auth middleware
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        trucks: {
          select: {
            id: true,
            licensePlate: true,
            model: true,
            capacity: true,
            currentLat: true,
            currentLng: true,
          },
        },
        transactions: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            amount: true,
            type: true,
            description: true,
            route: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        status: user.status,
        rating: user.rating,
        deliveriesCount: user.deliveriesCount,
        totalEarnings: user.totalEarnings,
        weeklyEarnings: user.weeklyEarnings,
        weeklyKmDriven: user.weeklyKmDriven,
        trucks: user.trucks || [],
        recentTransactions: user.transactions || [],
        lastActiveDate: user.lastActiveDate,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
    });
  }
};

/**
 * POST /api/auth/refresh-token - Refresh JWT access token
 */
const refreshToken = async (req, res) => {
  try {
    const schema = Joi.object({
      refreshToken: Joi.string().required().label('Refresh token'),
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { refreshToken } = req.body;

    // ⭐ USE THE NEW FUNCTION:
    const newAccessToken = refreshAccessToken(refreshToken);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: newAccessToken,
      },
    });
  } catch (error) {
    console.error('Refresh token error:', error.message);

    if (error.message === 'Invalid refresh token') {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired refresh token',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Token refresh failed',
    });
  }
};

module.exports = {
  sendOTP,
  verifyOTP,
  getProfile,
  refreshToken,
};
