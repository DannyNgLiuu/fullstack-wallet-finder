import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import protectedRoutes from './routes/protected.js';
import scanRoutes from './routes/scan.js';

dotenv.config(); // <-- Load .env first
connectDB();     // <-- Connect to MongoDB

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Use routes
app.use('/', authRoutes);

app.use('/', protectedRoutes);

app.use('/api', scanRoutes);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
