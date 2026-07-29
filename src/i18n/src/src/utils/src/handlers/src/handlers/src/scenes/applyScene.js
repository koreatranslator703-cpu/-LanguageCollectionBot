const { Scenes } = require('telegraf');
const prisma = require('../db');
const { t } = require('../i18n');
const { CORE_FIELDS, ADMIN_IDS } = require('../config');
const { choiceKeyboard, doneCancelKeyboard } = require('../keyboards');
const { classifyDocument } = require('../utils/fileType');

const SCENE_ID = 'APPLY_SCENE';

function buildFields(lang, questions) {
  const core = CORE_FIELDS.map((f) => ({
    key: f.key,
    label: t(lang, f.labelKey),
    type: f.type,
    options:
      f.type === 'choice'
        ? f.options.map((opt) =>
            opt === 'Company' ? t(lang, 'company_option') : opt === 'Freelancer' ? t(lang, 'freelancer_option') : opt
          )
        : undefined,
    isCore: true,
    questionId: null,
  }));

  const dynamic = questions.map((q) => ({
    key: `q_${q.id}`,
    label: q.label,
    type: q.type,
    options: q.options ? JSON.parse(q.options) : undefined,
    isCore: false,
    questionId: q.id,
  }));

  return [...core, ...dynamic];
}

async function askField(ctx) {
  const { fields, index } = ctx.scene.state;
  const lang = ctx.state.lang || 'en';
  const field = fields[index];

  if (field.type === 'choice' && field.options && field.options.length) {
    await ctx.reply(field.label, choiceKeyboard(field.options, 'ANSCHOICE'));
  } else {
    await ctx.reply(field.label);
  }
}

async function startUploadStage(ctx) {
  ctx.scene.state.stage = 'upload';
  const lang = ctx.state.lang || 'en';
  await ctx.reply(t(lang, 'ask_upload_intro'), doneCancelKeyboard(lang));
}

async function finalizeApplication(ctx) {
  const lang = ctx.state.lang || 'en';
  const { projectId, answers, files } = ctx.scene.state;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  const user = ctx.state.user;

  const application = await prisma.application.create({
    data: {
      userId: user.id,
      projectId,
      status: 'PENDING',
      answers: {
        create: Object.entries(answers).map(([fieldName, value]) => ({
          fieldName,
          value: String(value),
          questionId: fieldName.startsWith('q_') ? Number(fieldName.slice(2)) : null,
        })),
      },
      files: {
        create: files.map((f) => ({
          fileType: f.fileType,
          telegramFileId: f.telegramFileId,
          fileName: f.fileName || null,
        })),
      },
    },
  });

  await ctx.reply(t(lang, 'application_submitted', { project: project.title }));

  // Notify all admins of the new application
  const fullNameAnswer = answers['fullName'] || user.username || `User ${user.telegramId}`;
  const adminText = `🆕 New application\n\nProject: ${project.title}\nApplicant: ${fullNameAnswer}\nApplication ID: ${application.id}`;
  for (const adminId of ADMIN_IDS) {
    try {
      await ctx.telegram.sendMessage(adminId.toString(), adminText);
    } catch (err) {
      // admin may have never started the bot - ignore
    }
  }

  return ctx.scene.leave();
}

const applyScene = new Scenes.BaseScene(SCENE_ID);

applyScene.enter(async (ctx) => {
  const lang = ctx.state.lang || 'en';
  const projectId = ctx.scene.state.projectId;
  const questions = await prisma.question.findMany({
    where: { projectId },
    orderBy: { order: 'asc' },
  });

  ctx.scene.state.fields = buildFields(lang, questions);
  ctx.scene.state.index = 0;
  ctx.scene.state.answers = {};
  ctx.scene.state.files = [];
  ctx.scene.state.stage = 'questions';

  await askField(ctx);
});

applyScene.action(/^ANSCHOICE_(\d+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  if (ctx.scene.state.stage !== 'questions') return;
  const { fields, index } = ctx.scene.state;
  const field = fields[index];
  const optionIdx = Number(ctx.match[1]);
  const value = field.options[optionIdx];
  if (value === undefined) return;

  ctx.scene.state.answers[field.key] = value;
  ctx.scene.state.index += 1;

  if (ctx.scene.state.index >= fields.length) {
    await startUploadStage(ctx);
  } else {
    await askField(ctx);
  }
});

applyScene.on('text', async (ctx, next) => {
  if (ctx.message.text.startsWith('/')) {
    await ctx.scene.leave();
    return next();
  }
  const lang = ctx.state.lang || 'en';
  const { stage, fields, index } = ctx.scene.state;

  if (stage === 'questions') {
    const field = fields[index];
    if (field.type === 'choice') {
      // waiting for a button tap, ignore stray text
      return askField(ctx);
    }
    const value = ctx.message.text.trim();
    if (!value) return askField(ctx);

    ctx.scene.state.answers[field.key] = value;
    ctx.scene.state.index += 1;

    if (ctx.scene.state.index >= fields.length) {
      await startUploadStage(ctx);
    } else {
      await askField(ctx);
    }
    return;
  }

  if (stage === 'upload') {
    // Plain text during upload stage - remind them how to proceed
    await ctx.reply(t(lang, 'ask_upload_intro'), doneCancelKeyboard(lang));
  }
});

async function handleIncomingFile(ctx, fileType, fileId, fileName) {
  const lang = ctx.state.lang || 'en';
  if (ctx.scene.state.stage !== 'upload') return;

  ctx.scene.state.files.push({ fileType, telegramFileId: fileId, fileName });
  await ctx.reply(
    t(lang, 'upload_received', { count: ctx.scene.state.files.length }),
    doneCancelKeyboard(lang)
  );
}

applyScene.on('photo', async (ctx) => {
  const photos = ctx.message.photo;
  const largest = photos[photos.length - 1];
  await handleIncomingFile(ctx, 'image', largest.file_id, 'photo.jpg');
});

applyScene.on('video', async (ctx) => {
  await handleIncomingFile(ctx, 'video', ctx.message.video.file_id, ctx.message.video.file_name || 'video.mp4');
});

applyScene.on('voice', async (ctx) => {
  await handleIncomingFile(ctx, 'audio', ctx.message.voice.file_id, 'voice.ogg');
});

applyScene.on('audio', async (ctx) => {
  await handleIncomingFile(ctx, 'audio', ctx.message.audio.file_id, ctx.message.audio.file_name || 'audio.mp3');
});

applyScene.on('document', async (ctx) => {
  const doc = ctx.message.document;
  const fileType = classifyDocument(doc.file_name, doc.mime_type);
  await handleIncomingFile(ctx, fileType, doc.file_id, doc.file_name);
});

applyScene.action('UPLOAD_DONE', async (ctx) => {
  await ctx.answerCbQuery();
  if (ctx.scene.state.stage !== 'upload') return;
  await finalizeApplication(ctx);
});

applyScene.action('APPLY_CANCEL', async (ctx) => {
  await ctx.answerCbQuery();
  const lang = ctx.state.lang || 'en';
  await ctx.reply(t(lang, 'cancelled'));
  return ctx.scene.leave();
});

module.exports = { applyScene, SCENE_ID };
