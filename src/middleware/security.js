const helmet = require('helmet');

function applySecurity(app) {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'https:', 'data:'],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        fontSrc: ["'self'"],
        connectSrc: ["'self'"],
        frameSrc: [
          "'self'",
          'https://www.youtube.com',
          'https://youtube.com',
          'https://vk.com',
          'https://vkvideo.ru',
          'https://rutube.ru',
        ],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));
}

module.exports = {
  applySecurity,
};
