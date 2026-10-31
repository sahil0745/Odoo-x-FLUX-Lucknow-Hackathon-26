import { Router } from 'express';
import { productController } from './products.controller';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';

const router = Router();

// Public / Customer / Staff catalog read
router.get('/', (req, res, next) =>
  productController.listProducts(req, res, next)
);

router.get('/:id', (req, res, next) =>
  productController.getProductById(req, res, next)
);

// Admin & Staff catalog management endpoints
router.post('/', authenticate, requirePermission('products.manage'), (req, res, next) =>
  productController.createProduct(req, res, next)
);

router.patch('/:id', authenticate, requirePermission('products.manage'), (req, res, next) =>
  productController.updateProduct(req, res, next)
);

router.delete('/:id', authenticate, requirePermission('products.manage'), (req, res, next) =>
  productController.deleteProduct(req, res, next)
);

// Variant management endpoints
router.post('/:id/variants', authenticate, requirePermission('products.manage'), (req, res, next) =>
  productController.createVariant(req, res, next)
);

router.patch(
  '/:id/variants/:variantId',
  authenticate,
  requirePermission('products.manage'),
  (req, res, next) => productController.updateVariant(req, res, next)
);

router.delete(
  '/:id/variants/:variantId',
  authenticate,
  requirePermission('products.manage'),
  (req, res, next) => productController.deleteVariant(req, res, next)
);

export default router;
