const express = require('express');
const Feedback = require('../models/Feedback');

const router = express.Router();

// Route to create a new feedback
router.post('/:bookId', async (req, res) => {
  try {
    const { bookId } = req.params;
    const { content, stars } = req.body;

    if (!content || stars < 1 || stars > 5) {
      return res.status(400).json({ error: 'Invalid input data' });
    }

    const feedback = new Feedback({
      bookId,
      content,
      stars,
      timestamp: new Date(),
    });

    await feedback.save();
    res.status(201).json({ feedback });
  } catch (error) {
    console.error('Error creating feedback:', error);
    res.status(500).json({ error: 'Failed to create feedback' });
  }
});

// Route to get all feedbacks for a specific book
router.get('/:bookId', async (req, res) => {
  try {
    const { bookId } = req.params;
    const feedbacks = await Feedback.find({ bookId }).sort({ timestamp: -1 });
    res.status(200).json(feedbacks);
  } catch (error) {
    console.error('Error fetching feedbacks:', error);
    res.status(500).json({ error: 'Failed to fetch feedbacks' });
  }
});

// Route to delete feedback by ID
router.delete('/:feedbackId', async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const deletedFeedback = await Feedback.findByIdAndDelete(feedbackId);

    if (!deletedFeedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    res.status(200).json({ message: 'Feedback deleted successfully' });
  } catch (error) {
    console.error('Error deleting feedback:', error);
    res.status(500).json({ error: 'Failed to delete feedback' });
  }
});

module.exports = router;
