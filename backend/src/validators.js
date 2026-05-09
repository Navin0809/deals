const { z } = require('zod');

const registerSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(180),
  password: z.string().min(8).max(120),
  role: z.enum(['user', 'shop_owner']).default('user'),
  shopName: z.string().min(2).max(160).optional(),
  ownerPhone: z.string().min(7).max(40).optional(),
  address: z.string().min(5).max(255).optional(),
  city: z.string().min(2).max(100).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  googleMapsUrl: z.string().url().optional().or(z.literal(''))
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const dealSchema = z.object({
  categoryId: z.coerce.number().int().positive(),
  title: z.string().min(4).max(160),
  description: z.string().min(12).max(2000),
  couponCode: z.string().min(3).max(40).transform((value) => value.toUpperCase()),
  discountLabel: z.string().max(80).optional().or(z.literal('')),
  regularPrice: z.coerce.number().nonnegative().optional().nullable(),
  dealPrice: z.coerce.number().nonnegative().optional().nullable(),
  isBest: z.coerce.boolean().default(false),
  dealExpiresAt: z.coerce.date(),
  couponExpiresAt: z.coerce.date(),
  shopTimings: z.string().max(180).optional().or(z.literal('')),
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  googleMapsUrl: z.string().url().optional().or(z.literal('')),
  terms: z.string().max(1200).optional().or(z.literal('')),
  imageUrl: z.string().url().optional().or(z.literal(''))
});

const categorySchema = z.object({
  name: z.string().min(2).max(80),
  icon: z.string().min(2).max(40).default('tag')
});

const limitSchema = z.object({
  monthlyLimit: z.coerce.number().int().min(0).max(100)
});

function validate(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: 'Please check the form details.',
        errors: parsed.error.flatten().fieldErrors
      });
    }
    req.body = parsed.data;
    next();
  };
}

module.exports = { categorySchema, dealSchema, limitSchema, loginSchema, registerSchema, validate };
