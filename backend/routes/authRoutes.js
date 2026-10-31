const express = require('express');
const { login, getUsers, createUser, updateUser, deleteUser } = require('../controllers/authController');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/login', login);
router.get('/users', authenticate, authorizeRoles('super_admin'), getUsers);
router.post('/users', authenticate, authorizeRoles('super_admin'), createUser);
router.put('/users/:id', authenticate, authorizeRoles('super_admin'), updateUser);
router.delete('/users/:id', authenticate, authorizeRoles('super_admin'), deleteUser);

module.exports = router;
