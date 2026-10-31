import { Router } from 'express';
import { discountController } from './discounts.controller';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';

const router = Router();

router.use(authenticate);

// Public discount validation for checkout/quotation
router.post('/validate', (req, res, next) => discountController.validateCode(req, res, next));

router.get('/', (req, res, next) => discountController.listDiscounts(req, res, next));
router.get('/:id', (req, res, next) => discountController.getDiscountById(req, res, next));

// Admin discount management
router.post('/', requirePermission('discounts.manage'), (req, res, next) =>
  discountController.createDiscount(req, res, next)
);

router.patch('/:id', requirePermission('discounts.manage'), (req, res, next) =>
  discountController.updateDiscount(req, res, next)
);

router.delete('/:id', requirePermission('discounts.manage'), (req, res, next) =>
  discountController.deleteDiscount(req, res, next)
);

export default router;

