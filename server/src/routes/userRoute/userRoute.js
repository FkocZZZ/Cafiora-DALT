const express = require('express');
const router = express.Router();

const loginRoute = require('./loginRoute/loginRoute');
const currentRoute = require('./currentRoute/currentRoute');
const logoutRoute = require('./logoutRoute/logoutRoute');
const refreshRoute = require('./refreshCurrentRoute/refreshCurrentRoute');

router.use('/users', loginRoute);
router.use('/users', logoutRoute);
router.use('/users', currentRoute);
router.use('/users', refreshRoute);

module.exports = router;
