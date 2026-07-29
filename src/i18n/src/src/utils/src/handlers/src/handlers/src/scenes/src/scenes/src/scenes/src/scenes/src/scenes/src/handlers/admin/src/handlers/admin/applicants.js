const { Markup } = require('telegraf');
const prisma = require('../../db');
const { t } = require('../../i18n');
const { statusKeyboard, backToAdminKeyboard } = require('../../keyboards');
const { requireAdmin } = require('./dashboard');

async function listProjectsForApplicants(ctx) {
  await ctx.answerCbQuery();
  if (!(await requireAdmin(ctx))) return;
  const lang = ctx.state.lang || 'en';
  const projects = await prisma.project.findMany({ orderBy: { createdAt: 'asc' } });
  if (projects.length === 0) return ctx.reply(t(lang, 'admin_no_projects'), backToAdminKeyboard(lang));

  const kb = Markup.inlineKeyboard(
    projects.map((p) => [Markup.button.callback(p.title, `APPLICANTSPROJ_${p.id}`)])
  );
  await ctx.reply(t(lang, 'admin_select_applicant_project'), kb);
}

async function listApplicantsForProject(ctx) {
  await ctx.answerCbQuery();
  if (!(await requireAdmin(ctx))) return;
  const lang = ctx.state.lang || 'en';
  const projectId = Number(ctx.match[1]);

  const applications = await prisma.application.findMany({
    where: { projectId },
    include: { user: true, answers: true },
    orderBy: { createdAt: 'desc' },
  });

  if (applications.length === 0) return ctx.reply(t(lang, 'admin_no_applicants'), backToAdminKeyboard(lang));

  const kb = Markup.inlineKeyboard(
    applications.map((app) => {
      const nameAnswer = app.answers.find((a) => a.fieldName === 'fullName');
      const label = `${nameAnswer ? nameAnswer.value : app.user.username || app.user.telegramId} (${t(
        lang,
        `status_${app.status}`
      )})`;
      return [Markup.button.callback(label, `APPLICANT_${app.id}`)];
    })
  );
  await ctx.reply(t(lang, 'admin_select_applicant_project'), kb);
}

async function showApplicantDetail(ctx) {
  await ctx.answerCbQuery();
  if (!(await requireAdmin(ctx))) return;
  const lang = ctx.state.lang || 'en';
  const applicationId = Number(ctx.match[1]);

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { user: true, project: true, answers: true, files: true },
  });
  if (!application) return;

  const nameAnswer = application.answers.find((a) => a.fieldName === 'fullName');
  const name = nameAnswer ? nameAnswer.value : application.user.username || `User ${application.user.telegramId}`;

  const answersText = application.answers.map((a) => `• ${a.fieldName}: ${a.value}`).join('\n');
  const filesText = application.files.length
    ? `\n\n📎 Files: ${application.files.length} (${application.files.map((f) => f.fileType).join(', ')})`
    : '';

  const detail = t(lang, 'admin_applicant_details', {
    name,
    project: application.project.title,
    status: t(lang, `status_${application.status}`),
    date: application.createdAt.toISOString().slice(0, 10),
  });

  await ctx.reply(`${detail}\n\n${answersText}${filesText}`);

  const kb = Markup.inlineKeyboard([
    ...statusKeyboard(lang, application.id).reply_markup.inline_keyboard,
    [Markup.button.callback('✉️ Message applicant', `MSGAPPLICANT_${application.id}`)],
  ]);
  await ctx.reply(t(lang, 'admin_change_status', { name }), kb);
}

async function setApplicationStatus(ctx) {
  await ctx.answerCbQuery();
  if (!(await requireAdmin(ctx))) return;
  const lang = ctx.state.lang || 'en';
  const applicationId = Number(ctx.match[1]);
  const status = ctx.match[2];

  const application = await prisma.application.update({
    where: { id: applicationId },
    data: { status },
    include: { user: true, project: true },
  });

  await ctx.reply(t(lang, 'admin_status_changed', { status: t(lang, `status_${status}`) }));

  try {
    await ctx.telegram.sendMessage(
      application.user.telegramId.toString(),
      t(application.user.languageCode, 'status_update_notify', {
        project: application.project.title,
        status: t(application.user.languageCode, `status_${status}`),
      })
    );
  } catch (err) {
    // applicant may have blocked the bot
  }
}

async function enterMessageApplicantScene(ctx) {
  await ctx.answerCbQuery();
  if (!(await requireAdmin(ctx))) return;
  const applicationId = Number(ctx.match[1]);

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { user: true, answers: true },
  });
  if (!application) return;

  const nameAnswer = application.answers.find((a) => a.fieldName === 'fullName');
  const name = nameAnswer ? nameAnswer.value : application.user.username || `User ${application.user.telegramId}`;

  await ctx.scene.enter('ADMIN_MESSAGE_APPLICANT_SCENE', {
    userId: application.userId,
    applicantName: name,
  });
}

module.exports = {
  listProjectsForApplicants,
  listApplicantsForProject,
  showApplicantDetail,
  setApplicationStatus,
  enterMessageApplicantScene,
};
