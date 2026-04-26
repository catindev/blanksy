const path = require('node:path');

const express = require('express');
const cookieParser = require('cookie-parser');

const { applySecurity } = require('./middleware/security');
const { asyncHandler, notFoundHandler, errorHandler } = require('./middleware/error-handler');
const blanksRoutes = require('./blanks/blanks.routes');
const reportsRoutes = require('./reports/reports.routes');
const blanksService = require('./blanks/blanks.service');
const { renderEditorPage } = require('./views/editor-page');
const { renderBlankPage } = require('./views/blank-page');

function createApp() {
  const app = express();
  app.disable('x-powered-by');

  applySecurity(app);
  app.use(cookieParser());
  app.use(express.json({ limit: '256kb' }));
  app.use(express.urlencoded({ extended: false }));

  app.use('/static', express.static(path.resolve(process.cwd(), 'static')));
  app.use('/assets', express.static(path.resolve(__dirname, 'public')));

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
    response.type('html').send(renderBlankPage(blank));
  }));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = {
  createApp,
};
