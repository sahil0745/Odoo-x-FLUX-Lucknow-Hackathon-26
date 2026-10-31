import { Router } from 'express';
import { taxController } from './taxes.controller';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';

const router = Router();

router.use(authenticate);

router.get('/', (req, res, next) => taxController.listTaxRules(req, res, next));
router.get('/:id', (req, res, next) => taxController.getTaxRuleById(req, res, next));

router.post('/', requirePermission('taxes.manage'), (req, res, next) =>
  taxController.createTaxRule(req, res, next)
);

router.patch('/:id', requirePermission('taxes.manage'), (req, res, next) =>
  taxController.updateTaxRule(req, res, next)
);

router.delete('/:id', requirePermission('taxes.manage'), (req, res, next) =>
  taxController.deleteTaxRule(req, res, next)
);

export default router;

