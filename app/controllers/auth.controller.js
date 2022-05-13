require('dotenv').config();
const request = require('request');
let json_body;

// Import models.
const User = require('../models/user');
const Token = require('../models/token');

/*
 * Regiser new user in auth0.
 * Check whether user is already exist or not.
 * Create customer on Stripe.
*/
exports.Register = (req, res, next) => {

  User.findOne({ where: { email: req.body.email } })
    .then(async user => {

      // Check whether user is already exists or not.
      if (user) {
        const error = new Error('User already exists!');
        error.statusCode = 409;
        throw error;
      }

      const options = {
        method: 'POST',
        url: 'https://winner-yoga.us.auth0.com/dbconnections/signup',
        headers: { 'content-type': 'application/json' },
        form: {
          client_id: process.env.CLIENT_ID,
          connection: process.env.CONNECTION,
          email: req.body.email,
          password: req.body.password,
          name: req.body.name
        }
      }

      // Make sing-up request to third party Auth0 api.
      try {

        request(options, async (error, response, body) => {

          if (error) {
            console.log(error);
            return res.json(500).json({
              ErrorMessage: 'Some Auth0 error while making singup request!',
              status: 0
            })
          }

          // Check whether any logical error is occurd or not.
          json_body = JSON.parse(body);
          console.log(json_body);
          if (json_body.statusCode === 400 || json_body.error) {
            if (json_body.message === 'Password is too weak') {
              json_body.statusCode = 411;
            }
            if (!json_body.statusCode) {
              json_body.statusCode = 406;
            }
            return next(json_body);
          }
          try {
            const user = await User.findByPk(json_body.id);
            user.role = req.body.role;
            await user.save();
          } catch (error) {
            return res.status(400).json({ ERROR_MESSAGE: 'Database error!', status: 0 })
          }

          // Send success responce.
          return res.status(200).json({
            message: "User created successfully",
            data: {
              id: json_body.id,
              name: json_body.name,
              email: json_body.email
            },
            status: 1
          })

        })
      }
      catch (err) {
        console.log(err)
        const error = new Error('User creation failed!');
        error.statusCode = 422;
        throw error;
      }

    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });

}

/*
 * Login controller.
*/
exports.Login = async (req, res, next) => {
  try {
    const email = req.body.email;
    const password = req.body.password;

    const user = await User.findOne({ where: { email: email } });

    // Check whether user is already exist or not.
    if (!user) {
      return res.status(404).json({ message: 'User not exist!', status: 0 })
    }

    var options = {
      method: 'POST',
      url: 'https://winner-yoga.us.auth0.com/oauth/token',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      form: {
        grant_type: 'password',
        username: email,
        password: password,
        audience: process.env.AUDIENCE,
        scope: 'offline_access',
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET
      }
    };

    // Make login request to third party Auth0 api.


    request(options, async (error, response, body) => {
      if (error) {
        console.log(error);
        return res.status(500).json({
          ErrorMessage: 'Some Auth0 error while making login request!',
          status: 0
        })
      }

      // Check whether any logical error is occurd or not.
      json_body = JSON.parse(body);
      if (json_body.error) {
        return next(json_body);
      }

      try {

        const token = await Token.findOne({ where: { userId: user.id } });

        // Chech whether token exist or not.
        if (token) {
          token.access_count = token.access_count + 1;
          token.token = json_body.access_token;
          token.token_type = json_body.token_type;
          token.status = 'active';
          token.expires_in = json_body.expires_in;
          token.device_token = req.body.device_token;
          token.device_type = req.body.device_type;

          // Save updated token data.
          try {

            await token.save();

            // Send success response.
            return res.status(200).json({
              message: "Login successfully.",
              access_token: json_body.access_token,
              refresh_token: json_body.refresh_token,
              expires_in: json_body.expires_in,
              token_type: json_body.token_type,
              login_count: token.access_count,
              user: {
                id: user.id,
                name: user.name,
                email: user.email,
                country_code: user.country_code,
                phone: user.phone
              },
              status: 1
            });

          }
          catch (err) {
            const error = new Error('Token Updation Failed!');
            error.statusCode = 404;
            throw error;
          }

        }

        const payload = {
          userId: user.id,
          token: json_body.access_token,
          status: 'active',
          expires_in: json_body.expires_in,
          token_type: json_body.token_type,
          access_count: 1,
          device_token: req.body.device_token,
          device_type: req.body.device_type
        }

        // Create new token data.
        const new_token = await Token.create(payload);

        // Send success responce.
        return res.status(200).json({
          message: "Login successfully.",
          access_token: json_body.access_token,
          refresh_token: json_body.refresh_token,
          expires_in: json_body.expires_in,
          token_type: json_body.token_type,
          login_count: new_token.access_count,
          user: {
            id: user.id,
            name: user.name,
            email: user.email
          },
          status: 1
        });

      }
      catch (err) {
        console.log(err)
        return res.json({ ErrorMessage: "Database error!" })
      }

    });
  }
  catch (err) {
    console.log(err)
    const error = new Error('Login failed!');
    error.statusCode = 422;
    throw error;
  }
}

/*
 * Refresh token controller.
*/
exports.refreshToken = (req, res, next) => {
  try {
    var options = {
      method: 'POST',
      url: 'https://winner-yoga.us.auth0.com/oauth/token',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      form:
      {
        grant_type: 'refresh_token',
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        refresh_token: req.body.refresh_token
      }
    };

    // Make refresh token request to third party Auth0 api.

    request(options, function (error, response, body) {
      if (error) {
        console.log(error);
        return res.json(500).json({
          ErrorMessage: 'Some Auth0 error while making refresh_token request!',
          status: 0
        })
      }

      // Check whether any logical error is occurd or not.
      json_body = JSON.parse(body);
      if (json_body.statusCode === 400) {
        return next(json_body);
      }

      // Send success responce.
      return res.status(200).json({
        message: "Get access token successfully.",
        access_token: json_body.access_token,
        expires_in: json_body.expires_in,
        token_type: json_body.token_type,
        status: 1
      });

    });

  }
  catch (err) {
    console.log(err)
    const error = new Error('Getting refresh token failed!');
    error.statusCode = 422;
    throw error;
  }
}

/*
 * Forgot password controller.
*/
exports.forgotPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({ where: { email: req.body.email } });

    if (!user) {
      return res.status(404).json({
        ErrorMessage: "Email dose not exist!",
        status: 0
      });
    }

    const options = {
      method: 'POST',
      url: 'https://winner-yoga.us.auth0.com/dbconnections/change_password',
      headers: { 'content-type': 'application/json' },
      form:
      {
        client_id: process.env.CLIENT_ID,
        username: req.body.email,
        connection: process.env.CONNECTION
      }
    }



    // Make forgot_password request to third party Auth0 api.
    request(options, function (error, response, body) {
      if (error) {
        console.log(error);
        return res.json(500).json({
          ErrorMessage: 'Some Auth0 error while making forgot_password request!',
          status: 0
        })
      }

      // Send success reponse.
      return res.status(200).json({
        message: "Reset password link send to your email successfully",
        status: 1
      });

    });

  }
  catch (err) {
    console.log(err)
    const error = new Error('Forgot password failed!');
    error.statusCode = 422;
    throw error;
  }

}

/*
 * Logout controller.
*/
exports.Logout = (req, res, next) => {

  Token.findOne({ where: { userId: req.user_id } })
    .then(async token => {
      token.token = null;
      token.token_type = null;
      token.status = 'expired';
      await token.save();
      return res.status(200).json({ message: 'Logout successfully', status: 1 });
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });

}

/*
 * Change password through current password.
*/
exports.changePassword = (req, res, next) => {

  // Find user who send request.
  User.findOne({ where: { id: req.user_id } })
    .then(async user => {

      // Cheak Whether user exist or not.
      if (!user) {
        const error = new Error('User not exists!');
        error.statusCode = 404;
        throw error;
      }

      // Check whether password macth or not.
      const isEqual = await bcrypt.compare(req.body.currentPassword, user.password);
      if (!isEqual) {
        const error = new Error('Invalid Password');
        error.statusCode = 401;
        throw error;
      }

      // Crete new password and encrypt it.
      const new_password = await bcrypt.hash(req.body.newPassword, 10);
      user.password = new_password;

      // Save updated password in database.
      await user.save();

      return res.status(200).json({ message: 'Password changed successfully..', status: 1 })

    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });

}