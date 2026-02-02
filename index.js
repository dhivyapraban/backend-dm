const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const apiRoutes = require("./routes/api");
const authRoutes = require("./routes/auth");
const { PrismaClient } = require("@prisma/client");
const shipmentRoutes = require('./routes/shipments');
const deliveryRoutes = require('./routes/delivery');
const transactionRoutes = require('./routes/transaction');
const synergyRoutes = require('./routes/synergy');
const optimizationRoutes = require('./routes/routes');
const truckRoutes = require('./routes/truck');
const backhaulRoutes = require('./routes/backhaul');
const absorptionRoutes = require('./routes/absorption');
const packagesRoutes = require('./routes/packages');
const virtualHubRoutes = require('./routes/virtualHub');
const SynergyMonitor = require('./services/synergyMonitor');


dotenv.config();
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const prisma = new PrismaClient();

// Make io accessible to our routers
app.set('io', io);

// Initialize Synergy Monitor
let synergyMonitor;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/', (req, res) => {
    res.send('Logistics Backend API Working');
});

app.use('/api', apiRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/shipments', shipmentRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/synergy', synergyRoutes);
app.use('/api/routes', optimizationRoutes);
app.use('/api/trucks', truckRoutes);
app.use('/api/backhaul', backhaulRoutes);
app.use('/api/absorption', absorptionRoutes);
app.use('/api/packages', packagesRoutes);
app.use('/api/virtual-hubs', virtualHubRoutes);



// Socket.io connection logic
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Allow drivers to join their own room for targeted notifications
    socket.on('join', (room) => {
        socket.join(room);
        console.log(`Socket ${socket.id} joined room ${room}`);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Start Synergy Monitor after Socket.io is ready
synergyMonitor = new SynergyMonitor(io);
synergyMonitor.start();

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

        server.listen(PORT, () => {
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


