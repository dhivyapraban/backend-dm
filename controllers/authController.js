const prisma = require('../config/database');
const { generateAccessToken, refreshAccessToken } = require('../config/jwt');

const Joi = require('joi');


/**
 * Send OTP to phone number (register/login)
 */
const sendOTP = async (req, res) => {
  try {
    const schema = Joi.object({
      phone: Joi.string().pattern(/^\+91\d{10}$/).required().messages({
        'string.pattern.base': 'Phone must be +91xxxxxxxxxx format',
      }),
      role: Joi.string().valid('DRIVER', 'SHIPPER', 'DISPATCHER').required(),
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { phone, role } = req.body;

    // Check if user exists or create new
    let user = await prisma.user.findUnique({
      where: { phone },
    });

    if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: {
          phone,
          role,
          name: `User_${phone.slice(-4)}`, // Temporary name
        },
      });
    }

    // Generate 6-digit OTP (DEV MODE - print to console)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`🧑‍💻 DEV OTP for ${phone}: ${otp}`);
    console.log(`📱 In production: Send SMS to ${phone}`);

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      data: { 
        phone: user.phone,
        userId: user.id,
        tempName: user.name 
      },
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP',
    });
  }
};

/**
 * Verify OTP and issue JWT token
 */
const verifyOTP = async (req, res) => {
  try {
    const schema = Joi.object({
      phone: Joi.string().pattern(/^\+91\d{10}$/).required(),
      otp: Joi.string().length(6).required(),
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { phone, otp } = req.body;

    // DEV MODE: Accept any 6-digit OTP
    // PRODUCTION: Verify from Redis/SMS service
    if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP format',
      });
    }

    // Find user
    const user = await prisma.user.findUnique({
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
      return res.status(404).json({
        success: false,
        message: 'Phone number not registered',
      });
    }

    // Generate JWT token
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
      message: 'OTP verification failed',
    });
  }
};

/**
 * Get authenticated user profile
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
