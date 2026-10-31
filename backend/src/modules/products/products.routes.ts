import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { productsController } from './products.controller';
import { authenticate } from '../../middleware/authenticate';
import { requireRole, requirePermission } from '../../middleware/authorize';

const router = Router();

// All product endpoints require authentication
router.use(authenticate);

// -----------------------------------------------------------------------------
// READ & PRICING OPERATIONS (ADMIN, STAFF, CUSTOMER)
// -----------------------------------------------------------------------------

router.get(
  '/',
  requirePermission('products.read'),
  (req, res, next) => productsController.listProducts(req, res, next)
);

router.post(
  '/calculate-price',
  requirePermission('products.read'),
  (req, res, next) => productsController.calculatePrice(req, res, next)
);

router.get(
  '/:id',
  requirePermission('products.read'),
  (req, res, next) => productsController.getProductById(req, res, next)
);

router.post(
  '/:id/calculate-price',
  requirePermission('products.read'),
  (req, res, next) => productsController.calculatePrice(req, res, next)
);

// -----------------------------------------------------------------------------
// PRODUCT MANAGEMENT MUTATIONS (ADMIN ONLY)
// -----------------------------------------------------------------------------

router.post(
  '/',
  requireRole(UserRole.ADMIN),
  requirePermission('products.manage'),
  (req, res, next) => productsController.createProduct(req, res, next)
);

router.patch(
  '/:id',
  requireRole(UserRole.ADMIN),
  requirePermission('products.manage'),
  (req, res, next) => productsController.updateProduct(req, res, next)
);

router.patch(
  '/:id/status',
  requireRole(UserRole.ADMIN),
  requirePermission('products.manage'),
  (req, res, next) => productsController.updateProductStatus(req, res, next)
);

router.delete(
  '/:id',
  requireRole(UserRole.ADMIN),
  requirePermission('products.manage'),
  (req, res, next) => productsController.deleteProduct(req, res, next)
);

// -----------------------------------------------------------------------------
// VARIANT MANAGEMENT MUTATIONS (ADMIN ONLY)
// -----------------------------------------------------------------------------

router.post(
  '/:id/variants',
  requireRole(UserRole.ADMIN),
  requirePermission('products.manage'),
  (req, res, next) => productsController.createVariant(req, res, next)
);

router.patch(
  '/:id/variants/:variantId',
  requireRole(UserRole.ADMIN),
  requirePermission('products.manage'),
  (req, res, next) => productsController.updateVariant(req, res, next)
);

router.delete(
  '/:id/variants/:variantId',
  requireRole(UserRole.ADMIN),
  requirePermission('products.manage'),
  (req, res, next) => productsController.deleteVariant(req, res, next)
);

export default router;
