const session = require('express-session');
const bodyParser = require('body-parser');

module.exports = app => {
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());


    app.use(session({
        secret: 'your-secret-key',
        resave: false,
        saveUninitialized: false,
        cookie: { maxAge: 60 * 60 * 1000 }
    }));
};
