// app.js - Main application setup with Passport Local Strategy
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const filesRouter = require('./routes/filesRouter');
const pool = require('./db/pool'); // Database connection pool


const { PrismaSessionStore } = require('@quixo3/prisma-session-store');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();


const app = express();

// Set EJS as the view engine
app.set('view engine', 'ejs');

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));




// Passport Local Strategy
passport.use(
    new LocalStrategy(async (username, password, done) => {
        try {
            // Check if the username exists in the database
            const query = `SELECT * FROM users WHERE username = $1`;
            const result = await pool.query(query, [username]);

            if (result.rows.length === 0) {
                return done(null, false, { message: 'Incorrect username.' });
            }

            const user = result.rows[0];

            // Compare the hashed password
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return done(null, false, { message: 'Incorrect password.' });
            }

            return done(null, user);
        } catch (err) {
            return done(err);
        }
    })
);

// Serialize user into the session
passport.serializeUser((user, done) => {
    done(null, user.username); // Use username as the session identifier
});

// Deserialize user from the session
passport.deserializeUser(async (username, done) => {
    try {
        const query = `SELECT * FROM users WHERE username = $1`;
        const result = await pool.query(query, [username]);
        if (result.rows.length === 0) {
            return done(null, false);
        }
        done(null, result.rows[0]);
    } catch (err) {
        done(err);
    }
});


// Configure Session Middleware
app.use(
    session({
      secret: 'your_secret_key', // Replace with a secure secret
      resave: false, // Prevents resaving unchanged sessions
      saveUninitialized: false, // Avoids creating sessions for unauthenticated users
      cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 1 day in milliseconds
      },
      store: new PrismaSessionStore(prisma, {
        checkPeriod: 2 * 60 * 1000, // Check for expired sessions every 2 minutes
      }),
    })
  );
  

  app.use(passport.initialize());
  app.use(passport.session());


// Routes
app.use('/', filesRouter);

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
