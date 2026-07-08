import Share from '../models/Share.js';
import User from '../models/User.js';
import Account from '../models/Account.js';
import Budget from '../models/Budget.js';
import { invalidateDashboardCache } from './dashboardController.js';

// @desc    Get all shares (sent and received) for a user
// @route   GET /api/shares
// @access  Private
export const getShares = async (req, res) => {
  try {
    const sent = await Share.find({ ownerId: req.user.id })
      .populate('sharedWithId', 'name email')
      .populate('resourceId', 'name color icon type')
      .sort('-createdAt');

    const received = await Share.find({ sharedWithId: req.user.id })
      .populate('ownerId', 'name email')
      .populate('resourceId', 'name color icon type')
      .sort('-createdAt');

    res.json({ sent, received });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Create a new share
// @route   POST /api/shares
// @access  Private
export const createShare = async (req, res) => {
  try {
    const { resourceType, resourceId, shareeEmail, permission = 'read' } = req.body;

    if (!resourceType || !resourceId || !shareeEmail) {
      return res.status(400).json({ message: 'Veuillez fournir tous les champs requis.' });
    }

    if (!['account', 'budget'].includes(resourceType)) {
      return res.status(400).json({ message: 'Type de ressource invalide.' });
    }

    // Find the recipient user
    const sharee = await User.findOne({ email: shareeEmail.toLowerCase().trim() });
    if (!sharee) {
      return res.status(404).json({ message: 'L\'utilisateur avec cet e-mail n\'existe pas.' });
    }

    if (sharee._id.toString() === req.user.id) {
      return res.status(400).json({ message: 'Vous ne pouvez pas partager une ressource avec vous-même.' });
    }

    // Verify resource exists and current user owns it
    let resource;
    let resourceModel;
    if (resourceType === 'account') {
      resource = await Account.findById(resourceId);
      resourceModel = 'Account';
    } else {
      resource = await Budget.findById(resourceId);
      resourceModel = 'Budget';
    }

    if (!resource) {
      return res.status(404).json({ message: 'Ressource non trouvée.' });
    }

    if (resource.userId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Vous n\'êtes pas autorisé à partager cette ressource.' });
    }

    // Check if share already exists
    const existingShare = await Share.findOne({
      resourceType,
      resourceId,
      sharedWithId: sharee._id
    });

    if (existingShare) {
      return res.status(400).json({ message: 'Cette ressource est déjà partagée avec cet utilisateur.' });
    }

    const newShare = new Share({
      resourceType,
      resourceId,
      resourceModel,
      ownerId: req.user.id,
      sharedWithId: sharee._id,
      permission
    });

    await newShare.save();

    // Invalidate dashboard caches for both users to reflect updates
    invalidateDashboardCache(req.user.id);
    invalidateDashboardCache(sharee._id);

    const populatedShare = await Share.findById(newShare._id)
      .populate('sharedWithId', 'name email')
      .populate('resourceId', 'name color icon type');

    res.status(201).json(populatedShare);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Update share permission
// @route   PUT /api/shares/:id
// @access  Private
export const updateShare = async (req, res) => {
  try {
    const { permission } = req.body;
    if (!['read', 'write'].includes(permission)) {
      return res.status(400).json({ message: 'Permission invalide.' });
    }

    const share = await Share.findById(req.params.id);
    if (!share) {
      return res.status(404).json({ message: 'Partage non trouvé.' });
    }

    // Only owner can update the share permissions
    if (share.ownerId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Non autorisé.' });
    }

    share.permission = permission;
    await share.save();

    invalidateDashboardCache(share.ownerId);
    invalidateDashboardCache(share.sharedWithId);

    const populatedShare = await Share.findById(share._id)
      .populate('sharedWithId', 'name email')
      .populate('resourceId', 'name color icon type');

    res.json(populatedShare);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Delete/Revoke a share
// @route   DELETE /api/shares/:id
// @access  Private
export const deleteShare = async (req, res) => {
  try {
    const share = await Share.findById(req.params.id);
    if (!share) {
      return res.status(404).json({ message: 'Partage non trouvé.' });
    }

    // Owner can revoke, or sharee can leave
    const isOwner = share.ownerId.toString() === req.user.id;
    const isSharee = share.sharedWithId.toString() === req.user.id;

    if (!isOwner && !isSharee) {
      return res.status(401).json({ message: 'Non autorisé.' });
    }

    await Share.findByIdAndDelete(req.params.id);

    invalidateDashboardCache(share.ownerId);
    invalidateDashboardCache(share.sharedWithId);

    res.json({ message: 'Partage révoqué avec succès.' });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server Error');
  }
};
