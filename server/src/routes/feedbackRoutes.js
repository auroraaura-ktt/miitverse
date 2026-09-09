import { Router } from 'express';

import { authMiddleware } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { createFeedback, deleteFeedbackById, listFeedback } from '../utils/feedbackStore.js';

const router = Router();

// Submit feedback from any authenticated user
<<<<<<< HEAD
router.post('/', authMiddleware, async (req, res) => {
  const { rating, message } = req.body || {};

  try {
    const feedback = await createFeedback({
=======
router.post('/', authMiddleware, (req, res) => {
  const { rating, message } = req.body || {};

  try {
    const feedback = createFeedback({
>>>>>>> a897f00351ea1fac8e09bd3a9ec9c49a8eeb6079
      userId: req.user.id,
      username: req.user.username || req.user.email || 'MiitVerse member',
      rating,
      message,
    });

    return res.status(201).json({ feedback });
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Failed to save feedback' });
  }
});

// Admin: list all feedback
<<<<<<< HEAD
router.get('/', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const feedback = await listFeedback();
    return res.json({ feedback });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load feedback' });
  }
});

// Admin: delete feedback
router.delete('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const deleted = await deleteFeedbackById(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Feedback not found' });
    return res.json({ message: 'Feedback deleted' });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to delete feedback' });
  }
});

export default router;
=======
router.get('/', authMiddleware, requireRole('admin'), (req, res) => {
  res.json({ feedback: listFeedback() });
});

// Admin: delete feedback
router.delete('/:id', authMiddleware, requireRole('admin'), (req, res) => {
  const deleted = deleteFeedbackById(req.params.id);
  if (!deleted) return res.status(404).json({ message: 'Feedback not found' });
  return res.json({ message: 'Feedback deleted' });
});

export default router;
>>>>>>> a897f00351ea1fac8e09bd3a9ec9c49a8eeb6079
