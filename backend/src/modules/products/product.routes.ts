import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { productController } from './product.controller';
import { authenticate } from '../../middleware/authenticate';
import { requireRole, requirePermission } from '../../middleware/authorize';

const router = Router();

// All catalog operations require authentication
router.use(authenticate);

// Public catalog viewing for all authenticated roles (Admin, Staff, Customer)
router.get(
  '/',
  requirePermission('products.read'),
  (req, res, next) => productController.listProducts(req, res, next)
);

router.get(
  '/:id',
  requirePermission('products.read'),
  (req, res, next) => productController.getProductById(req, res, next)
);

// Catalog modifications restricted strictly to ADMIN with 'products.manage'
router.post(
  '/',
  requireRole(UserRole.ADMIN),
  requirePermission('products.manage'),
  (req, res, next) => productController.createProduct(req, res, next)
);

router.put(
  '/:id',
  requireRole(UserRole.ADMIN),
  requirePermission('products.manage'),
  (req, res, next) => productController.updateProduct(req, res, next)
);

router.delete(
  '/:id',
  requireRole(UserRole.ADMIN),
  requirePermission('products.manage'),
  (req, res, next) => productController.deleteProduct(req, res, next)
);

// Product Variants
router.post(
  '/:productId/variants',
  requireRole(UserRole.ADMIN),
  requirePermission('products.manage'),
  (req, res, next) => productController.createVariant(req, res, next)
);

router.put(
  '/:productId/variants/:variantId',
  requireRole(UserRole.ADMIN),
  requirePermission('products.manage'),
  (req, res, next) => productController.updateVariant(req, res, next)
);

router.delete(
  '/:productId/variants/:variantId',
  requireRole(UserRole.ADMIN),
  requirePermission('products.manage'),
  (req, res, next) => productController.deleteVariant(req, res, next)
);

export default router;
