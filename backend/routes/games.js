// javascript
import express from 'express';
import { Game, Tag, Review, User, GameReport, ReviewVote } from '../models/index.js';
import authenticateToken  from '../middleware/auth.js';
import { Op, literal } from 'sequelize';
import sequelize from '../config/db.js';

const router = express.Router();

// GET /api/games
router.get('/', async (_req, res) => {
    try {
        const games = await Game.findAll({
            include: [
                { model: Tag, as: 'tags', through: { attributes: [] }, attributes: ['id', 'name'] },
                {
                    model: Review,
                    as: 'reviews',
                    include: [{ model: User, as: 'user', attributes: ['id', 'username'] }]
                }
            ]
        });
        res.json(games.map(serializeGame));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/:id/reviews', authenticateToken, async (req, res) => {
    try {
        const gameId = req.params.id;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const { rating, comment } = req.body;

        if (rating == null) {
            return res.status(400).json({ message: 'rating is required' });
        }

        const review = await Review.create({
            rating,
            comment,
            gameId,
            userId,
        });

        res.status(201).json(review);
    } catch (e) {
        console.error('Error creating review:', e);
        res.status(500).json({ message: 'Failed to create review' });
    }
});

// Search function
router.get('/search', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) return res.json([]);

    // Prefer prefix matches, then anywhere matches, then alphabetical by length for predictable UX.
    const escPrefix = sequelize.escape(`${q}%`);
    const escAnywhere = sequelize.escape(`%${q}%`);

    const results = await Game.findAll({
      where: { title: { [Op.like]: `%${q}%` } },
      attributes: ['id', 'title', 'platform', 'rating'],
      order: [
        [literal(`CASE WHEN title LIKE ${escPrefix} THEN 0 WHEN title LIKE ${escAnywhere} THEN 1 ELSE 2 END`), 'ASC'],
        [literal('LENGTH(title)'), 'ASC']
      ],
      limit: 10
    });

    res.json(results);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ message: 'Search failed' });
  }
});

const normalizePath = (p) => {
    if (p == null) return null;
    const s = String(p).trim();
    if (!s) return null;
    return s.startsWith('/') ? s : `/${s}`;
};

const serializeGame = (g) => {
    const tags = g.tags?.map((t) => ({ id: t.id, name: t.name })) || [];
    const reviews =
        g.reviews?.map((r) => ({
            id: r.id,
            rating: r.rating,
            comment: r.comment,
            createdAt: r.createdAt,
            user: r.user
                ? {
                    id: r.user.id,
                    username: r.user.username
                }
                : null
        })) || [];

    return {
        id: g.id,
        name: g.title,
        platform: g.platform,
        developer: g.developer,
        category: g.category,
        releaseDate: g.releaseDate,
        rating: g.rating,
        description: g.description,
        images: Array.isArray(g.thumbImages)
            ? g.thumbImages.map(normalizePath).filter(Boolean)
            : [],
        tags,
        reviews
    };
};

router.get('/:id/reviews', async (req, res) => {
    try {
        const gameId = req.params.id;
        const auth = req.headers.authorization || '';
        const [, token] = auth.split(' ');
        let currentUserId = null;
        try {
          if (token) {
            const jwt = (await import('jsonwebtoken')).default;
            const payload = jwt.verify(token, process.env.JWT_SECRET);
            currentUserId = payload?.id || null;
          }
        } catch {}

        const reviews = await Review.findAll({
            where: { gameId },
            include: [
                { model: User, as: 'user', attributes: ['id', 'username', 'email'] },
                { model: ReviewVote, as: 'votes', attributes: ['userId', 'value'] },
            ],
            order: [['createdAt', 'DESC']],
        });

        const data = reviews.map(r => {
          const likes = (r.votes || []).filter(v => v.value === 1).length;
          const dislikes = (r.votes || []).filter(v => v.value === -1).length;
          const myVote = (r.votes || []).find(v => v.userId === currentUserId)?.value || 0;
          return {
            id: r.id,
            rating: r.rating,
            comment: r.comment,
            createdAt: r.createdAt,
            user: r.user ? { id: r.user.id, username: r.user.username, email: r.user.email } : null,
            likes,
            dislikes,
            myVote
          };
        });

        res.json(data);
    } catch (e) {
        console.error('Error fetching reviews:', e);
        res.status(500).json({ message: 'Failed to fetch reviews' });
    }
});

router.post('/reviews/:reviewId/vote', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const reviewId = Number(req.params.reviewId);
    let { value } = req.body || {};
    value = Number(value);
    if (![1, -1, 0].includes(value)) return res.status(400).json({ message: 'value must be 1 (like), -1 (dislike) or 0 (clear)' });

    const review = await Review.findByPk(reviewId);
    if (!review) return res.status(404).json({ message: 'Review not found' });

    if (value === 0) {
      await ReviewVote.destroy({ where: { userId, reviewId } });
      return res.json({ ok: true, value: 0 });
    }

    const [vote] = await ReviewVote.findOrCreate({
      where: { userId, reviewId },
      defaults: { userId, reviewId, value }
    });
    if (vote.value !== value) {
      vote.value = value;
      await vote.save();
    }

    res.json({ ok: true, value: vote.value });
  } catch (e) {
    console.error('Vote error:', e);
    res.status(500).json({ message: 'Failed to vote' });
  }
});

router.post('/:id/reports', authenticateToken, async (req, res) => {
    try {
        const gameId = Number(req.params.id);
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        if (Number.isNaN(gameId)) {
            return res.status(400).json({ message: 'Invalid game id' });
        }

        const { message } = req.body || {};
        if (!message || typeof message !== 'string' || !message.trim()) {
            return res.status(400).json({ message: 'Message is required' });
        }

        const game = await Game.findByPk(gameId);
        if (!game) {
            return res.status(404).json({ message: 'Game not found' });
        }

        const cleanMessage = message.trim();

        await GameReport.create({
            gameId,
            userId,
            message: cleanMessage,
            status: false,
        });

        // Per spec: just return status; no JSON body required
        return res.sendStatus(201);
    } catch (e) {
        console.error('Error handling game report:', e);
        return res.status(500).json({ message: 'Failed to submit report' });
    }
});

router.get('/reports', authenticateToken, async (req, res) => {
    try {
        if (!req.user || !req.user.isAdmin) {
            return res.status(403).json({ message: 'Admins only' });
        }
        const reports = await GameReport.findAll({
            order: [['createdAt', 'DESC']],
            include: [
                { model: Game, as: 'game', attributes: ['id', 'title'] },
                { model: User, as: 'user', attributes: ['id'] },
            ],
        });

        const output = reports.map((r) => ({
            id: r.id,
            message: r.message,
            status: r.status,
            createdAt: r.createdAt,
            userId: r.user ? r.user.id : null,
            game: r.game ? { id: r.game.id, title: r.game.title } : null,
        }));

        res.json(output);
    } catch (e) {
        console.error('Error fetching game reports:', e);
        res.status(500).json({ message: 'Failed to load reports' });
    }
});

router.patch('/reports/:id', authenticateToken, async (req, res) => {
    try {
        if (!req.user || !req.user.isAdmin) {
            return res.status(403).json({ message: 'Admins only' });
        }
        const reportId = Number(req.params.id);
        if (Number.isNaN(reportId)) {
            return res.status(400).json({ message: 'Invalid report id' });
        }

        const report = await GameReport.findByPk(reportId);
        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }

        report.status = true;
        await report.save();

        return res.sendStatus(204);
    } catch (e) {
        console.error('Error updating game report status:', e);
        return res.status(500).json({ message: 'Failed to update report status' });
    }
});

// DELETE /api/games/:id (admin only)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        if (!req.user || !req.user.isAdmin) {
            return res.status(403).json({ message: 'Admins only' });
        }
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            return res.status(400).json({ message: 'Invalid id' });
        }
        const game = await Game.findByPk(id);
        if (!game) {
            return res.status(404).json({ message: 'Game not found' });
        }

        // Mark all reports for this game as resolved before deletion
        await GameReport.update(
            { status: true },
            { where: { gameId: id } }
        );

        await game.destroy();
        return res.sendStatus(204);
    } catch (e) {
        console.error('Error deleting game:', e);
        return res.status(500).json({ message: 'Failed to delete game' });
    }
});

// GET /api/games/:id (must come after more specific routes like /search, /reports, /:id/reviews)
router.get('/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
        const game = await Game.findByPk(id, {
            include: [
                { model: Tag, as: 'tags', through: { attributes: [] }, attributes: ['id', 'name'] },
                {
                    model: Review,
                    as: 'reviews',
                    include: [{ model: User, as: 'user', attributes: ['id', 'username'] }]
                }
            ]
        });
        if (!game) return res.status(404).json({ error: 'Game not found' });
        res.json(serializeGame(game));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
