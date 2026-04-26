const helmet = require('helmet');

function applySecurity(app) {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // cdn.jsdelivr.net нужен для mermaid.js. В production можно
        // скачать mermaid.min.js и убрать CDN из этого списка.
        scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
        styleSrc: ["'self'", "'unsafe-inline'"],
        fontSrc: ["'self'"],
        connectSrc: ["'self'"],
        imgSrc: [
          "'self'",
          'https:',
          // www.plantuml.com нужен для рендеринга PlantUML диаграмм через API
          'https://www.plantuml.com',
        ],
        frameSrc: [
          "'self'",
          'https://www.youtube.com',
          'https://youtube.com',
          'https://vk.com',
          'https://vkvideo.ru',
          'https://rutube.ru',
        ],
        // blob: нужен для Web Workers внутри mermaid.js
        workerSrc: ["'self'", 'blob:'],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));
}

module.exports = {
  applySecurity,
};
