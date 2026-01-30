const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const apiRoutes = require("./routes/api");
const authRoutes = require("./routes/auth");
const { PrismaClient } = require("@prisma/client");

dotenv.config();
const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.get('/', (req, res) => {
    res.send('Logistics Backend API Working');
});

app.use('/api', apiRoutes);
app.use('/api/auth', authRoutes);

process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.error(err.name, err.message, err.stack);
    process.exit(1);
});

process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION! 💥 Shutting down...');
    console.error(err.name, err.message, err.stack);
    process.exit(1);
});

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        console.log("Checking database connection...");
        await prisma.$connect();
        console.log("Database connected successfully.");

        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        }).on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.error(`Error: Port ${PORT} is already in use.`);
            } else {
                console.error('Server error:', err);
            }
            process.exit(1);
        });
    } catch (error) {
        console.error("CRITICAL: Failed to connect to the database:", error.message);
        process.exit(1);
    }
}

startServer();

