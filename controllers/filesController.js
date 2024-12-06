const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const pool = require('../db/pool');

/**
 * Middleware to check if the user is authenticated
 */
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  res.status(401).send('You must be logged in to access this page.');
};

/**
 * Render the Home Page
 */
const renderHomePage = async (req, res) => {
  try {
    const user = req.user || null;
    const userType = user ? user.user_type : 'user';

    // Fetch messages, folders, and root directory files
    const messages = await fetchMessagesFromDB(userType);
    const folders = await getFolders(path.join(__dirname, '../uploads'));
    const rootFiles = await getFilesInDirectory(path.join(__dirname, '../uploads'));

    res.render('index', { user, messages, folders, rootFiles });
  } catch (err) {
    console.error('Error rendering home page:', err);
    res.status(500).send('Server error');
  }
};

/**
 * Add a New Message
 */
const addNewMessage = async (req, res) => {
  const user = req.user;

  if (!user) {
    return res.status(401).send('You must be logged in to post a message.');
  }

  const { newMessageTitle, newMessage } = req.body;

  try {
    await insertMessage(user.username, newMessageTitle, newMessage);

    res.redirect('/');
  } catch (err) {
    console.error('Error adding new message:', err);
    res.status(500).send('Server error while adding message.');
  }
};

/**
 * Handle Membership Upgrade
 */
const upgradeToMember = async (req, res) => {
  const { membershipPasscode } = req.body;
  const user = req.user;

  if (!user) {
    return res.status(401).send('You must be logged in to become a member.');
  }

  if (user.user_type === 'member') {
    return res.redirect('/');
  }

  const correctPasscode = 'Secret';
  if (membershipPasscode !== correctPasscode) {
    return res.status(401).send('Incorrect passcode. Please try again.');
  }

  try {
    const query = `
      UPDATE users
      SET user_type = 'member'
      WHERE username = $1;
    `;
    await pool.query(query, [user.username]);

    req.user.user_type = 'member';
    res.redirect('/');
  } catch (err) {
    console.error('Error upgrading membership:', err);
    res.status(500).send('Server error');
  }
};

/**
 * Render the Sign-Up Form
 */
const renderSignUpForm = (req, res) => {
  res.render('signUp');
};

/**
 * Handle User Sign-Up
 */
const handleSignUp = async (req, res) => {
  const { username, password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    return res.status(400).send('Passwords do not match.');
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const query = `
      INSERT INTO users (username, password, user_type)
      VALUES ($1, $2, 'user');
    `;
    await pool.query(query, [username, hashedPassword]);

    res.redirect('/log-in');
  } catch (err) {
    console.error('Error during sign-up:', err);
    res.status(500).send('Server error during sign-up.');
  }
};

/**
 * Render the Log-In Form
 */
const renderLogInForm = (req, res) => {
  res.render('logIn');
};

/**
 * Handle User Log-Out
 */
const handleLogOut = (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Error during log-out:', err);
      return res.status(500).send('Server error during log-out.');
    }
    res.redirect('/');
  });
};

/**
 * Render the File Upload Form
 */
const renderUploadForm = (req, res) => {
  res.render('fileUploaderForm');
};

/**
 * Handle File Uploads
 */
const handleFileUpload = (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  console.log('Uploaded File:', {
    originalname: req.file.originalname,
    filename: req.file.filename,
    path: req.file.path,
    size: req.file.size,
    description: req.body.description,
  });

  res.send({
    message: 'File uploaded successfully!',
    file: {
      originalname: req.file.originalname,
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
      description: req.body.description,
    },
  });
};

/**
 * Display Folder Contents
 */
const displayFolderContents = (req, res) => {
  const folderPath = path.join(__dirname, '../uploads', req.params[0] || '');
  const relativePath = req.params[0] || '';

  if (!fs.existsSync(folderPath)) {
    return res.status(404).send({ message: 'Folder not found.' });
  }

  fs.readdir(folderPath, { withFileTypes: true }, (err, items) => {
    if (err) {
      console.error(`Error reading folder: ${err}`);
      return res.status(500).send({ message: 'Error reading folder contents.' });
    }

    const subfolders = items.filter((item) => item.isDirectory()).map((folder) => folder.name);
    const files = items.filter((item) => item.isFile()).map((file) => file.name);

    res.render('folder', { folderPath: relativePath, subfolders, files });
  });
};

/**
 * Create a New Folder
 */
const createNewFolder = (req, res) => {
  const { folderName } = req.body;
  const basePath = path.join(__dirname, '../uploads', req.params[0] || '');
  const folderPath = path.join(basePath, folderName);

  if (!folderName) {
    return res.status(400).send({ message: 'Folder name is required.' });
  }

  if (fs.existsSync(folderPath)) {
    return res.status(400).send({ message: 'Folder already exists.' });
  }

  fs.mkdir(folderPath, (err) => {
    if (err) {
      console.error(`Error creating folder: ${err}`);
      return res.status(500).send({ message: 'Error creating folder.' });
    }

    res.redirect(`/folder/${req.params[0] || ''}`);
  });
};

/**
 * Handle Folder-Specific File Upload
 */
const handleFolderUpload = (req, res) => {
  const folderPath = req.params[0] || '';

  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  console.log(`File uploaded to folder: ${folderPath}`, req.file);

  res.redirect(`/folder/${folderPath}`);
};

// Helper Functions
const fetchMessagesFromDB = async (userType) => {
  const query =
    userType === 'member'
      ? 'SELECT * FROM messages ORDER BY timestamp DESC'
      : 'SELECT message_title, message, timestamp FROM messages ORDER BY timestamp DESC';

  const { rows } = await pool.query(query);
  return rows;
};

const getFolders = (directoryPath) => {
  return new Promise((resolve, reject) => {
    fs.readdir(directoryPath, { withFileTypes: true }, (err, items) => {
      if (err) {
        return reject(err);
      }

      const folders = items.filter((item) => item.isDirectory()).map((folder) => folder.name);
      resolve(folders);
    });
  });
};

const getFilesInDirectory = (directoryPath) => {
  return new Promise((resolve, reject) => {
    fs.readdir(directoryPath, { withFileTypes: true }, (err, items) => {
      if (err) {
        return reject(err);
      }

      const files = items.filter((item) => item.isFile()).map((file) => file.name);
      resolve(files);
    });
  });
};

// Export all functions
module.exports = {
  renderHomePage,
  addNewMessage,
  upgradeToMember,
  renderSignUpForm,
  handleSignUp,
  renderLogInForm,
  handleLogOut,
  renderUploadForm,
  handleFileUpload,
  displayFolderContents,
  createNewFolder,
  handleFolderUpload,
  isAuthenticated,
};
