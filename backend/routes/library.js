import express from 'express';
import { Op, fn, col, literal } from 'sequelize';
import { Game, Tag } from '../models/index.js';
import TAG_GROUPS, { ALL_TAGS } from '../models/tags.js';

const router = express.Router();

// GET /api/tag-groups — returns the canonical tag groups
router.get('/tag-groups', (req, res) => {
  res.json({ groups: TAG_GROUPS });
});

// GET /api/games — returns games with associated tag names
router.get('/games', async (req, res) => {
  try {
    const games = await Game.findAll({
      include: [
        {
          model: Tag,
          as: 'tags',
          attributes: ['id', 'name'],
          through: { attributes: [] }
        }
      ],
      order: [['title', 'ASC']]
    });

    const payload = games.map((g) => ({
      id: g.id,
      title: g.title,
      platform: g.platform,
      releaseDate: g.releaseDate,
      rating: g.rating,
      images: Array.isArray(g.thumbImages) ? g.thumbImages : [],
      tags: (g.tags || []).map((t) => t.name).sort()
    }));

    res.json(payload);
  } catch (err) {
    console.error('Failed to fetch games', err);
    res.status(500).json({ message: 'Unable to load games' });
  }
});

// GET /api/games/search?q=&tags=Tag1,Tag2
// Returns games that match the free-text query and include ALL provided tags.
router.get('/games/search', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const tagsParam = String(req.query.tags || '').trim();
    const requestedTags = tagsParam
      ? tagsParam.split(',').map((t) => t.trim()).filter(Boolean)
      : [];

    // Validate against canonical list; ignore unknowns
    const validTags = requestedTags.filter((t) => ALL_TAGS.includes(t));

    // Build game where clause for query
    const where = {};
    if (q) {
      const like = `%${q}%`;
      where[Op.or] = [
        { title: { [Op.like]: like } },
        { platform: { [Op.like]: like } }
      ];
    }

    // If no filters at all, delegate to plain /games
    if (!q && validTags.length === 0) {
      const games = await Game.findAll({
        include: [{ model: Tag, as: 'tags', attributes: ['id', 'name'], through: { attributes: [] } }],
        order: [['title', 'ASC']]
      });
      const payload = games.map((g) => ({
        id: g.id,
        title: g.title,
        platform: g.platform,
        releaseDate: g.releaseDate,
        rating: g.rating,
        images: Array.isArray(g.thumbImages) ? g.thumbImages : [],
        tags: (g.tags || []).map((t) => t.name).sort()
      }));
      return res.json(payload);
    }

    // Include tags filter: join only requested tags and require all via HAVING COUNT(DISTINCT) = validTags.length
    const include = [
      {
        model: Tag,
        as: 'tags',
        attributes: ['id', 'name'],
        through: { attributes: [] },
        ...(validTags.length > 0
          ? { where: { name: { [Op.in]: validTags } } }
          : {})
      }
    ];

    const queryOptions = {
      where,
      include,
      order: [['title', 'ASC']],
      group: ['Game.id'],
      // Having only when tags are supplied
      ...(validTags.length > 0
        ? {
            having: literal(`COUNT(DISTINCT \`tags\`.\`id\`) = ${validTags.length}`)
          }
        : {})
    };

    const games = await Game.findAll(queryOptions);
    const payload = games.map((g) => ({
      id: g.id,
      title: g.title,
      platform: g.platform,
      releaseDate: g.releaseDate,
      rating: g.rating,
      images: Array.isArray(g.thumbImages) ? g.thumbImages : [],
      tags: (g.tags || []).map((t) => t.name).sort()
    }));
    return res.json(payload);
  } catch (err) {
    console.error('Search failed', err);
    res.status(500).json({ message: 'Unable to search games' });
  }
});

export default router;
