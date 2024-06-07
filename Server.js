
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const mongoose = require('mongoose');
const User = require('./models/User');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

mongoose.connect('mongodb://localhost:27017/file-transfer', { useNewUrlParser: true, useUnifiedTopology: true });

app.use(express.json());

// User Registration
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword });
    await user.save();
    res.status(201).send('User registered');
});

// User Login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (user && await bcrypt.compare(password, user.password)) {
        const token = jwt.sign({ id: user._id }, 'secret', { expiresIn: '1h' });
        res.json({ token });
    } else {
        res.status(401).send('Invalid credentials');
    }
});

// File Upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage });

app.post('/upload', upload.single('file'), (req, res) => {
    res.status(200).send('File uploaded successfully');
});

io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('send-file', (data) => {
        socket.broadcast.emit('receive-file', data);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

server.listen(5000, () => {
    console.log('Server is running on port 5000');
});

