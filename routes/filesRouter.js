// filesRouter.js - Routing for members and file upload functionality
const express = require('express');
const passport = require('passport');
const multer = require('multer');
const path = require('path');
const {
  renderHomePage,
  addNewMessage,
  upgradeToMember,
  renderSignUpForm,
  handleSignUp,
  renderLogInForm,
  handleLogOut,
  renderUploadForm,
  handleFileUpload,
  handleFolderUpload,
  createNewFolder,
  displayFolderContents,
  isAuthenticated,
} = require('../controllers/filesController');

const router = express.Router();

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folderPath = path.join(__dirname, '../uploads', req.params[0] || '');
    cb(null, folderPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// Routes

// Home page route
router.get('/', renderHomePage);

// Add a new message route
router.post('/new-message', addNewMessage);

// Membership upgrade route
router.post('/become-a-member', upgradeToMember);

// Sign-up form route
router.get('/sign-up', renderSignUpForm);

// Handle user sign-up
router.post('/sign-up', handleSignUp);

// Log-in form route
router.get('/log-in', renderLogInForm);

// Handle user log-in
router.post(
  '/log-in',
  passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/log-in',
    failureFlash: false,
  })
);

// Handle user log-out
router.get('/log-out', handleLogOut);

// Route to display the file upload form
router.get('/upload', isAuthenticated, renderUploadForm);

// Route to handle file uploads
router.post('/upload', isAuthenticated, upload.single('file'), handleFileUpload);

// Route to display folder contents
router.get('/folder/*', displayFolderContents);

// Route to upload files into specific folders
router.post('/folder/*/upload', upload.single('file'), handleFolderUpload);

// Route to create new folders (recursive support)
router.post('/folder/*/create', createNewFolder);

module.exports = router;
