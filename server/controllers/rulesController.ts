import { Request, Response } from 'express';
import CategorizationRule from '../models/CategorizationRule';
import Transaction from '../models/Transaction';
import { evaluateRule, applyRuleRetroactively, ITransactionInputData } from '../services/rulesEngine';

/**
 * Récupérer toutes les règles d'un utilisateur triées par priorité
 */
export const getRules = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const rules = await CategorizationRule.find({ userId }).sort({ priority: 1 });
    res.json(rules);
  } catch (error) {
    console.error('Erreur getRules:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des règles' });
  }
};

/**
 * Créer une nouvelle règle
 */
export const createRule = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { name, priority, isActive, matchLogic, conditions, actions, applyRetroactively } = req.body;

    // Si aucune priorité n'est précisée, la mettre en dernier
    let rulePriority = priority;
    if (!rulePriority) {
      const count = await CategorizationRule.countDocuments({ userId });
      rulePriority = count + 1;
    }

    const rule = new CategorizationRule({
      userId,
      name,
      priority: rulePriority,
      isActive: isActive !== undefined ? isActive : true,
      matchLogic: matchLogic || 'AND',
      conditions,
      actions
    });

    await rule.save();

    let updatedCount = 0;
    if (applyRetroactively) {
      updatedCount = await applyRuleRetroactively(userId, rule._id.toString());
    }

    res.status(201).json({ rule, retroactivelyAppliedCount: updatedCount });
  } catch (error) {
    console.error('Erreur createRule:', error);
    res.status(500).json({ message: 'Erreur lors de la création de la règle' });
  }
};

/**
 * Mettre à jour une règle existante
 */
export const updateRule = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const { applyRetroactively, ...updateData } = req.body;

    const rule = await CategorizationRule.findOneAndUpdate(
      { _id: id, userId },
      { $set: updateData },
      { new: true }
    );

    if (!rule) {
      res.status(404).json({ message: 'Règle non trouvée' });
      return;
    }

    let updatedCount = 0;
    if (applyRetroactively) {
      updatedCount = await applyRuleRetroactively(userId, rule._id.toString());
    }

    res.json({ rule, retroactivelyAppliedCount: updatedCount });
  } catch (error) {
    console.error('Erreur updateRule:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour de la règle' });
  }
};

/**
 * Supprimer une règle
 */
export const deleteRule = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const rule = await CategorizationRule.findOneAndDelete({ _id: id, userId });
    if (!rule) {
      res.status(404).json({ message: 'Règle non trouvée' });
      return;
    }

    res.json({ message: 'Règle supprimée avec succès' });
  } catch (error) {
    console.error('Erreur deleteRule:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression de la règle' });
  }
};

/**
 * Re-prioriser plusieurs règles par glisser-déposer
 */
export const reorderRules = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { ruleIds } = req.body; // Array d'IDs ordonné

    const bulkOps = ruleIds.map((id: string, index: number) => ({
      updateOne: {
        filter: { _id: id, userId },
        update: { $set: { priority: index + 1 } }
      }
    }));

    await CategorizationRule.bulkWrite(bulkOps);
    const rules = await CategorizationRule.find({ userId }).sort({ priority: 1 });
    res.json(rules);
  } catch (error) {
    console.error('Erreur reorderRules:', error);
    res.status(500).json({ message: 'Erreur lors de la réorganisation des règles' });
  }
};

/**
 * Tester une règle sans enregistrer sur une transaction exemple
 */
export const testRule = async (req: Request, res: Response): Promise<void> => {
  try {
    const { conditions, matchLogic, sampleTransaction } = req.body;
    const mockRule = {
      conditions,
      matchLogic: matchLogic || 'AND'
    } as any;

    const isMatch = evaluateRule(sampleTransaction, mockRule);
    res.json({ isMatch });
  } catch (error) {
    console.error('Erreur testRule:', error);
    res.status(500).json({ message: 'Erreur lors du test de la règle' });
  }
};

/**
 * Suggérer la création automatique d'une règle (Pattern Detection)
 * Repère les libellés récurrents (3+ fois) non régis par une règle
 */
export const getSuggestedRules = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const existingRules = await CategorizationRule.find({ userId });
    
    // Mots-clés ou descriptions déjà couverts par une règle
    const coveredKeywords = new Set<string>();
    existingRules.forEach(rule => {
      rule.conditions.forEach(c => {
        if (typeof c.value === 'string') coveredKeywords.add(c.value.toLowerCase().trim());
      });
    });

    // Recherche d'aggrégation sur les transactions des 90 derniers jours
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const patterns = await Transaction.aggregate([
      {
        $match: {
          userId,
          date: { $gte: ninetyDaysAgo },
          description: { $ne: '' },
          categoryId: { $ne: null }
        }
      },
      {
        $group: {
          _id: {
            desc: { $toLower: '$description' },
            categoryId: '$categoryId'
          },
          count: { $sum: 1 },
          originalDescription: { $first: '$description' }
        }
      },
      {
        $match: {
          count: { $gte: 3 }
        }
      },
      { $limit: 5 }
    ]);

    const suggestions = patterns
      .filter(p => !coveredKeywords.has(p._id.desc.trim()))
      .map(p => ({
        descriptionKeyword: p.originalDescription,
        categoryId: p._id.categoryId,
        count: p.count
      }));

    res.json(suggestions);
  } catch (error) {
    console.error('Erreur getSuggestedRules:', error);
    res.status(500).json({ message: 'Erreur lors de la génération des suggestions' });
  }
};
