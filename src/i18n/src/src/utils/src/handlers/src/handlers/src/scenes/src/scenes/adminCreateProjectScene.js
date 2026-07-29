const { Scenes, Markup } = require('telegraf');
const prisma = require('../db');
const { t } = require('../i18n');
const { doneCancelSimpleKeyboard, questionTypeKeyboard, skipKeyboard } = require('../utils/adminKeyboards');

const SCENE_ID = 'ADMIN_CREATE_PROJECT_SCENE';

const scene = new Scenes.BaseScene(SCENE_ID);

scene.enter(async (ctx) => {
  const lang = ctx.state.lang || 'en';
  ctx.scene.state.stage = 'title';
  ctx.scene.state.questions = []; // { label, type, options }
  await ctx.reply(t(lang, 'admin_ask_project_title'));
});

scene.on('text', async (ctx, next) => {
  if (ctx.message.text.startsWith('/')) {
    await ctx.scene.leave();
    return next();
  }
  const lang = ctx.state.lang || 'en';
  const text = ctx.message.text.trim();
  const state = ctx.scene.state;

  if (state.stage === 'title') {
    if (!text) return ctx.reply(t(lang, 'admin_ask_project_title'));
    state.title = text;
    state.stage = 'description';
    return ctx.reply(t(lang, 'admin_ask_project_description'), skipKeyboard(lang));
  }

  if (state.stage === 'description') {
    state.description = text;
    state.stage = 'q_label';
    return ctx.reply(t(lang, 'admin_ask_question_label'), doneCancelSimpleKeyboard(lang));
  }

  if (state.stage === 'q_label') {
    state.currentQuestionLabel = text;
    state.stage = 'q_type';
    return ctx.reply(t(lang, 'admin_ask_question_type', { label: text }), questionTypeKeyboard(lang));
  }

  if (state.stage === 'q_options') {
    const options = text.split(',').map((o) => o.trim()).filter(Boolean);
    state.questions.push({ label: state.currentQuestionLabel, type: 'choice', options });
    state.currentQuestionLabel = null;
    state.stage = 'q_label';
    return ctx.reply(t(lang, 'admin_ask_question_label'), doneCancelSimpleKeyboard(lang));
  }
});

scene.action('ADMIN_SKIP_DESCRIPTION', async (ctx) => {
  await ctx.answerCbQuery();
  const lang = ctx.state.lang || 'en';
  ctx.scene.state.description = null;
  ctx.scene.state.stage = 'q_label';
  await ctx.reply(t(lang, 'admin_ask_question_label'), doneCancelSimpleKeyboard(lang));
});

scene.action('QTYPE_TEXT', async (ctx) => {
  await ctx.answerCbQuery();
  const lang = ctx.state.lang || 'en';
  const state = ctx.scene.state;
  state.questions.push({ label: state.currentQuestionLabel, type: 'text' });
  state.currentQuestionLabel = null;
  state.stage = 'q_label';
  await ctx.reply(t(lang, 'admin_ask_question_label'), doneCancelSimpleKeyboard(lang));
});

scene.action('QTYPE_CHOICE', async (ctx) => {
  await ctx.answerCbQuery();
  const lang = ctx.state.lang || 'en';
  const state = ctx.scene.state;
  state.stage = 'q_options';
  await ctx.reply(t(lang, 'admin_ask_question_options', { label: state.currentQuestionLabel }));
});

scene.action('ADMIN_DONE_QUESTIONS', async (ctx) => {
  await ctx.answerCbQuery();
  const lang = ctx.state.lang || 'en';
  const state = ctx.scene.state;

  const project = await prisma.project.create({
    data: {
      title: state.title,
      description: state.description || null,
      questions: {
        create: state.questions.map((q, idx) => ({
          label: q.label,
          type: q.type,
          options: q.options ? JSON.stringify(q.options) : null,
          order: idx,
        })),
      },
    },
  });

  await ctx.reply(t(lang, 'admin_project_created', { title: project.title, count: state.questions.length }));
  return ctx.scene.leave();
});

scene.action('ADMIN_CANCEL', async (ctx) => {
  await ctx.answerCbQuery();
  const lang = ctx.state.lang || 'en';
  await ctx.reply(t(lang, 'cancelled'));
  return ctx.scene.leave();
});

module.exports = { scene, SCENE_ID };
