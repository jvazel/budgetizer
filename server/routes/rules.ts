import { Router } from 'express';
import { protect } from '../middleware/authMiddleware';
import validateRequest from '../middleware/validateRequest';
import {
  createRuleSchema,
  updateRuleSchema,
  reorderRulesSchema,
  testRuleSchema
} from '../../shared/validators/ruleValidators.js';
import {
  getRules,
  createRule,
  updateRule,
  deleteRule,
  reorderRules,
  testRule,
  getSuggestedRules
} from '../controllers/rulesController';

const router = Router();

router.use(protect);

router.get('/', getRules);
router.post('/', validateRequest(createRuleSchema), createRule);
router.put('/reorder', validateRequest(reorderRulesSchema), reorderRules);
router.post('/test', validateRequest(testRuleSchema), testRule);
router.get('/suggestions', getSuggestedRules);

router.put('/:id', validateRequest(updateRuleSchema), updateRule);
router.delete('/:id', deleteRule);

export default router;
