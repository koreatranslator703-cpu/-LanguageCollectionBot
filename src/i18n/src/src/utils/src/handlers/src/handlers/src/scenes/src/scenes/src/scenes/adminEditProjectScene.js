const { Scenes, Markup } = require('telegraf');
const prisma = require('../db');
const { t } = require('../i18n');

const SCENE_ID = 'ADMIN_EDIT_PROJECT_SCENE';

function editMenuKeyboard(lang) {
  return Markup.inlineKeyboard([
    [Markup.button.callback(t(lang, 'admin_edit_title_btn'), 'EDIT_TITLE')],
    [Markup.button.callback(t(lang, 'admin_edit_description_btn'), 'EDIT_DESCRIPTION')],
    [Markup.button.callback(t(lang, 'admin_edit_toggle_btn'), 'EDIT_TOGGLE')],
    [Markup.button.callback(t(lang, 'admin_back'), 'EDIT_BACK')],
  ]);
}

const scene = new Scenes.BaseScene(SCENE_ID);

scene.enter(async (ctx) => {
  const lang = ctx.state.lang || 'en';
  const project = await prisma.project.findUnique({ where: { id: ctx.scene.state.projectId } });
  if (!project) return ctx.scene.leave();
  ctx.scene.state.stage = 'menu';
  await ctx.reply(t(lang, 'admin_edit_menu', { title: project.title }), editMenuKeyboard(lang));
});

scene.action('EDIT_TITLE', async (ctx) => {
  await ctx.answerCbQuery();
  const lang = ctx.state.lang || 'en';
  ctx.scene.state.stage = 'edit_title';
  await ctx.reply(t(lang, 'admin_ask_project_title'));
});

scene.action('EDIT_DESCRIPTION', async (ctx) => {
  await ctx.answerCbQuery();
  const lang = ctx.state.lang || 'en';
  ctx.scene.state.stage = 'edit_description';
  await ctx.reply(t(lang, 'admin_ask_project_description'));
});

scene.action('EDIT_TOGGLE', async (ctx) => {
  await ctx.answerCbQuery();
  const lang = ctx.state.lang || 'en';
  const project = await prisma.project.findUnique({ where: { id: ctx.scene.state.projectId } });
  const updated = await prisma.project.update({
    where: { id: project.id },
    data: { isActive: !project.isActive },
  });
  await ctx.reply(t(lang, 'admin_project_toggled', { state: updated.isActive ? 'ACTIVE' : 'INACTIVE' }));
  return ctx.scene.leave();
});

scene.action('EDIT_BACK', async (ctx) => {
  await ctx.answerCbQuery();
  return ctx.scene.leave();
});

scene.on('text', async (ctx, next) => {
  if (ctx.message.text.startsWith('/')) {
    await ctx.scene.leave();
    return next();
  }
  const lang = ctx.state.lang || 'en';
  const stage = ctx.scene.state.stage;
  const text = ctx.message.text.trim();
  if (!text) return;

  if (stage === 'edit_title') {
    await prisma.project.update({ where: { id: ctx.scene.state.projectId }, data: { title: text } });
    await ctx.reply(t(lang, 'admin_project_updated'));
    return ctx.scene.leave();
  }

  if (stage === 'edit_description') {
    await prisma.project.update({ where: { id: ctx.scene.state.projectId }, data: { description: text } });
    await ctx.reply(t(lang, 'admin_project_updated'));
    return ctx.scene.leave();
  }
});

module.exports = { scene, SCENE_ID };
