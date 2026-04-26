const path = require('node:path');

const compression = require('compression');
const express = require('express');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const { applySecurity } = require('./middleware/security');
const {
  asyncHandler,
  notFoundHandler,
  errorHandler,
  redactUrlSecrets,
} = require('./middleware/error-handler');
const blanksRoutes = require('./blanks/blanks.routes');
const reportsRoutes = require('./reports/reports.routes');
const blanksService = require('./blanks/blanks.service');
const { renderEditorPage } = require('./views/editor-page');
const { renderBlankPage } = require('./views/blank-page');

function parseTrustProxy(value) {
  if (!value) {
    return null;
  }

  const normalized = String(value).trim().toLowerCase();
  if (!normalized || normalized === 'false' || normalized === '0') {
    return null;
  }

  if (normalized === 'true') {
    return 1;
  }

  if (/^\d+$/.test(normalized)) {
    return Number(normalized);
  }

  return value;
}

function applyRequestLogging(app) {
  morgan.token('safe-url', (request) => redactUrlSecrets(request.originalUrl || request.url));

  const format = process.env.NODE_ENV === 'production'
    ? ':remote-addr - :remote-user [:date[clf]] ":method :safe-url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"'
    : ':method :safe-url :status :response-time ms - :res[content-length]';

  app.use(morgan(format));
}

function createApp() {
  const app = express();
  app.disable('x-powered-by');

  const trustProxy = parseTrustProxy(process.env.TRUST_PROXY);
  if (trustProxy !== null) {
    app.set('trust proxy', trustProxy);
  }

  applySecurity(app);
  app.use(compression());
  applyRequestLogging(app);
  app.use(cookieParser());
  app.use(express.json({ limit: '256kb' }));
  app.use(express.urlencoded({ extended: false }));

  app.use('/static', express.static(path.resolve(process.cwd(), 'static'), {
    maxAge: '7d',
  }));
  app.use('/assets', express.static(path.resolve(__dirname, 'public'), {
    maxAge: '1d',
  }));

  app.get('/health', (request, response) => {
    response.json({ ok: true });
  });

  app.use('/api', blanksRoutes);
  app.use('/api', reportsRoutes);

  app.get('/', (request, response) => {
    response.type('html').send(renderEditorPage());
  });

  app.get('/:path', asyncHandler(async (request, response) => {
    const blank = await blanksService.getBlankForPage(request.params.path);

    // Опубликованные blanks кешируются 60 секунд.
    // При наличии CDN — добавить s-maxage отдельно.
    response
      .type('html')
      .set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
      .set('ETag', `"${blank.updatedAt}"`)
      .send(renderBlankPage(blank));
  }));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = {
  createApp,
  parseTrustProxy,
  redactUrlSecrets,
};
