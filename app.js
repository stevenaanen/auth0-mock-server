process.env.DEBUG = 'app*';

var express = require('express');
var app = express();
var querystring = require('querystring');
var https = require('https');
var jwt = require('jsonwebtoken');
var fs = require('fs');
var Debug = require('debug');
var cors = require('cors');
var bodyParser = require('body-parser');

var debug = Debug('app');

// Configure our small auth0-mock-server
app.options('*', cors())
    .use(cors())
    .use(bodyParser.json())
    .use(bodyParser.urlencoded({ extended: true }));

// Welcome route (to accept untrusted https cert in browser)
app.get('/', function (req, res) {
    res.send('Awesome, you have access to the OAuth mock service');
});

// app.get('/authorize', function (req, res) {
//     const { response_type, client_id, redirect_uri, state } = req.query;
//     debug('authorize', req.query);
//     var access_token = jwt.sign({
//         user_id: 'auth0|useremail',
//     }, 'auth0-mock');
//     const id_token = 'auth0-mock:idtoken';

//     const params = {
//         access_token,
//         id_token,
//         state,
//         token_type: 'Bearer',
//         expires_in: 7200,
//     };

//     res.setHeader("x-auth0-requestid", "blablabla");

//     res.send();
// });

app.get('/authorize', function (req, res) {
    const { response_type, client_id, scope, nonce, redirect_uri, state } = req.query;
    debug('authorize', req.query);

    const tokenOptions = {
        algorithm: "HS256",
        expiresIn: 7200,
        issuer: "https://localhost:3000/",
        audience: "http://localhost",
        noTimestamp: false,
    };
    var access_token = jwt.sign({
        user_id: 'auth0|useremail',
        scopes: scope,
    }, 'auth0-mock', tokenOptions);

    var id_token = jwt.sign({
        name: "Username",
        picture: "",
    }, 'auth0-mock', tokenOptions);

    const params = {
        access_token,
        // id_token,
        state,
        token_type: 'Bearer',
        expires_in: 7200,
    };
    const queryString = querystring.stringify(params);

    const url = `${redirect_uri}#${queryString}`;
    debug('redirect to', url);
    res.redirect(url);
});

app.get('/login', function (req, res) {
    const { response_type, client_id, redirect_uri, state } = req.query;
    debug('login', req.query);
    var access_token = jwt.sign({
        user_id: 'auth0|useremail',
    }, 'auth0-mock');
    const id_token = 'auth0-mock:idtoken';

    const params = {
        access_token,
        id_token,
        state,
        token_type: 'Bearer',
        expires_in: 7200,
    };
    const queryString = querystring.stringify(params);

    const url = `${redirect_uri}?${queryString}`;
    debug('redirect to', url);
    res.redirect(url);
});

// This route can be used to generate a valid jwt-token.
app.post('/oauth/token', function (req, res) {
    if (!req.body.email || !req.body.password) {
        debug('Body is invalid!');
        return res.status(400).send('Email or password is missing!');
    }
    var token = jwt.sign({
        user_id: 'auth0|' + req.body.email,
    }, 'auth0-mock');
    debug('Signed token for ' + req.body.email);
    res.json({ token });
});

// This route can be used to generate a valid jwt-token.
app.get('/oauth/token/:email', function (req, res) {
    if (!req.params.email) {
        debug('No user was given!');
        return res.status(400).send('user is missing');
    }
    var token = jwt.sign({
        user_id: 'auth0|' + req.params.email,
    }, 'auth0-mock');
    debug('Signed token for ' + req.params.email);
    res.json({ token });
});


// This route returns the inside of a jwt-token. Your main application
// should use this route to keep the auth0-flow
app.post('/oauth/tokeninfo', function (req, res) {
    if (!req.body.id_token) {
        debug('No token given in the body!');
        return res.status(401).send('missing id_token');
    }
    var data = jwt.decode(req.body.id_token);
    if (data) {
        debug('Return token data from ' + data.user_id);
        res.json(data);
    } else {
        debug('The token was invalid and could not be decoded!');
        res.status(401).send('invalid id_token');
    }
});

https.createServer({
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.cert')
}, app)
    .listen(3000, function () {
        debug('Auth0-Mock-Server listening on port 3000!');
        console.log('Example app listening on port 3000! Go to https://localhost:3000/')
    })
