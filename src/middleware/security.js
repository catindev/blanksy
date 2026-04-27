const helmet = require('helmet');

function applySecurity(app) {
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc:  ["'self'"],
        styleSrc:   ["'self'", "'unsafe-inline'"],
        fontSrc:    ["'self'"],
        connectSrc: ["'self'"],
        imgSrc:     ["'self'", 'https:'],
        frameSrc: [
          "'self'",
          'https://www.youtube.com',
          'https://youtube.com',
          'https://vk.com',
          'https://vkvideo.ru',
          'https://rutube.ru',
        ],
        workerSrc: ["'self'"],
        upgradeInsecureRequests: isProduction ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
  }));
}

module.exports = { applySecurity };
