import express from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../models/User.js";
import bcrypt from "bcrypt";
dotenv.config();

const router = express.Router();

// Register
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: "username, email and password are required" });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(409).json({ message: "Email already in use" });

    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) return res.status(409).json({ message: "Username already in use" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, password: hashed });

    // Optionally auto-login: issue token
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "1h" });

    res.status(201).json({ id: user.id, username: user.username, email: user.email, token });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Registration failed" });
  }
});

// Login username or email
router.post("/login", async (req, res) => {
  try {
    const { identifier, username, email, password } = req.body;
    const idValue = identifier || username || email; // backward compatibility
    if (!idValue || !password) return res.status(400).json({ message: "identifier (username or email) and password are required" });

    const user = await User.findOne({ where: { username: idValue } })
      || await User.findOne({ where: { email: idValue } });

    if (!user) return res.status(404).json({ message: "User not found" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "Invalid password" });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.json({ token, id: user.id, username: user.username, email: user.email });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Login failed" });
  }
});

router.get('/me', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const [, token] = auth.split(' ');
    if (!token) return res.status(401).json({ message: 'Missing token' });

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: 'Invalid token' });
    }

    const user = await User.findByPk(payload.id, { attributes: ['id', 'username', 'email', 'createdAt', 'isAdmin'] });
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json(user);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to load profile' });
  }
});

export default router;
