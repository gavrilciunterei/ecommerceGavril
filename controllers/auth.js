const User = require('../models/user');
const jwt = require('jsonwebtoken'); // to generate signin token
const expressJwt = require('express-jwt'); // for authorization check
const { errorHandler } = require('../helpers/dbErrorHandler');

var controller = {
  signup: function (req, res) {
    //console.log(req.body);
    const user = new User(req.body);
    user.save((err, user) => {
      if (err) {
        return res.status(400).json({
          err: errorHandler(err),
        });
      }
      user.salt = undefined;
      user.hashed_password = undefined;
      res.json({
        user,
      });
    });
  },

  signin: function (req, res) {
    // find the user based on email
    const { email, password } = req.body;
    User.findOne({ email }, (err, user) => {
      if (err || !user) {
        return res.status(400).json({
          err: 'User with that email does not exists',
        });
      }
      // if user is found make sure that email and password match
      // create atuthenticate method in user model
      if (!user.authenticate(password)) {
        return res.status(401).json({
          err: 'Email and password dont match',
        });
      }

      // generate a signed token with user id and secret
      const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
      // persist the token as 't' in cookie with expire date
      res.cookie('t', token, { expire: new Date() + 9999 });
      // return response with user and token to frontend client
      const { _id, name, email, role } = user;
      return res.json({ token, user: { _id, name, email, role } });
    });
  },

  signout: function (req, res) {
    res.clearCookie('t');
    res.json({ message: 'Signout success' });
  },

  requireSignin: expressJwt({
    secret: process.env.JWT_SECRET,
    userProperty: 'auth',
    algorithms: ['HS256'],
  }),

  isAuth: function (req, res, next) {
    let user = req.profile && req.auth && req.profile._id == req.auth._id;
    if (!user) {
      return res.status(403).json({
        error: 'Acces denied',
      });
    }
    next();
  },

  isAdmin: function (req, res, next) {
    if (req.profile.role === 0) {
      return res.status(403).json({
        error: 'Admin resource! Acces denied',
      });
    }
    next();
  },
};

module.exports = controller;
