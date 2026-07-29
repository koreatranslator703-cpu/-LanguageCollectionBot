const { Telegraf, Scenes } = require('telegraf');
const express = require('express');
const { BOT_TOKEN, PORT } = require('./config');
const { pgSession } = require('./session');
const { ensureUser } = require('./middlewares');

const { sendWelcome, handleStartButton, handleLanguageCommand, handleLanguageSelect } = require('./handlers/start');
const { showProjectDetail, backToProjects } = require('./handlers/projects');

const { applyScene } = require('./scenes/applyScene');
const { scene: adminCreateProjectScene } = require('./scenes/adminCreateProjectScene');
const { scene: adminEditProjectScene } = require('./scenes/adminEditProjectScene');
const { scene: adminBroadcastScene } = require('./scenes/adminBroadcastScene');
const { scene: adminMessageApplicantScene } = require('./scenes/adminMessageApplicantScene');

const {
  showDashboard,
  showDashboardCb,
  listProjectsForEdit,
  listProjectsForDelete,
  confirmDeleteProject,
  deleteProject,
} = require('./handlers/admin/dashboard');
const {
  listProjectsForApplicants,
  listApplicantsForProject,
  showApplicantDetail,
  setApplicationStatus,
  enterMessageApplicantScene,
} = require('./handlers/admin/applicants');
const { showStats } = require('./handlers/admin/stats');
const { exportCsv, exportExcel, exportJson } = require('./handlers/admin/export');

const bot = new Telegraf(BOT_TOKEN);

// --- Global middleware -------------------------------------------------
bot.use(pgSession());
bot.use(ensureUser);

const stage = new Scenes.Stage([
  applyScene,
  adminCreateProjectScene,
  adminEditProjectScene,
  adminBroadcastScene,
  adminMessageApplicantScene,
]);
bot.use(stage.middleware());

// --- User-facing commands ----------------------------------------------
bot.start(async (ctx) => sendWelcome(ctx));
bot.command('language', handleLanguageCommand);
bot.action('START', handleStartButton);
bot.action(/^LANG_(\w+)$/, handleLanguageSelect);

bot.action(/^PROJECT_(\d+)$/, showProjectDetail);
bot.action('BACK_TO_PROJECTS', backToProjects);

bot.action(/^APPLY_(\d+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const projectId = Number(ctx.match[1]);
  await ctx.scene.enter('APPLY_SCENE', { projectId });
});

// --- Admin commands ------------------------------------------------------
bot.command('admin', showDashboard);
bot.action('ADMIN_HOME', showDashboardCb);

bot.action('ADMIN_CREATE_PROJECT', async (ctx) => {
  await ctx.answerCbQuery();
  if (!ctx.state.user.isAdmin) return;
  await ctx.scene.enter('ADMIN_CREATE_PROJECT_SCENE');
});

bot.action('ADMIN_EDIT_PROJECT', listProjectsForEdit);
bot.action(/^EDITPROJ_(\d+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  if (!ctx.state.user.isAdmin) return;
  const projectId = Number(ctx.match[1]);
  await ctx.scene.enter('ADMIN_EDIT_PROJECT_SCENE', { projectId });
});

bot.action('ADMIN_DELETE_PROJECT', listProjectsForDelete);
bot.action(/^DELPROJ_(\d+)$/, confirmDeleteProject);
bot.action(/^DELCONFIRM_(\d+)$/, deleteProject);

bot.action('ADMIN_STATS', showStats);

bot.action('ADMIN_APPLICANTS', listProjectsForApplicants);
bot.action(/^APPLICANTSPROJ_(\d+)$/, listApplicantsForProject);
bot.action(/^APPLICANT_(\d+)$/, showApplicantDetail);
bot.action(/^SETSTATUS_(\d+)_(\w+)$/, setApplicationStatus);
bot.action(/^MSGAPPLICANT_(\d+)$/, enterMessageApplicantScene);

bot.action('ADMIN_BROADCAST', async (ctx) => {
  await ctx.answerCbQuery();
  if (!ctx.state.user.isAdmin) return;
  await ctx.scene.enter('ADMIN_BROADCAST_SCENE');
});

bot.action('ADMIN_EXPORT_CSV', exportCsv);
bot.action('ADMIN_EXPORT_EXCEL', exportExcel);
bot.action('ADMIN_EXPORT_JSON', exportJson);

// --- Fallbacks -------------------------------------------------------------
bot.catch((err, ctx) => {
  console.error(`Error while handling update ${ctx.update.update_id}:`, err);
});

// --- Tiny keep-alive web server (Railway health checks) ---------------------
const app = express();
app.get('/', (req, res) => res.send('LanguageCollectionBot is running.'));
app.listen(PORT, () => console.log(`Health check server listening on port ${PORT}`));

// --- Launch -----------------------------------------------------------------
bot.launch().then(() => console.log('@LanguageCollectionBot is up and running (long polling).'));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
