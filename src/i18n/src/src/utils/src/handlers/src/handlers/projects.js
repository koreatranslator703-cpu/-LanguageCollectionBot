const prisma = require('../db');
const { t } = require('../i18n');
const { projectsKeyboard, applyKeyboard } = require('../keyboards');

async function showProjects(ctx) {
  const lang = ctx.state.lang || 'en';
  const projects = await prisma.project.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
  });

  if (projects.length === 0) {
    await ctx.reply(t(lang, 'no_projects'));
    return;
  }

  await ctx.reply(
    `${t(lang, 'available_projects')}\n\n${t(lang, 'project_list_intro')}`,
    projectsKeyboard(projects)
  );
}

async function showProjectDetail(ctx) {
  await ctx.answerCbQuery();
  const lang = ctx.state.lang || 'en';
  const projectId = Number(ctx.match[1]);
  const project = await prisma.project.findUnique({ where: { id: projectId } });

  if (!project || !project.isActive) {
    await ctx.reply(t(lang, 'no_projects'));
    return;
  }

  const text = project.description ? `*${project.title}*\n\n${project.description}` : `*${project.title}*`;
  await ctx.reply(text, { parse_mode: 'Markdown', ...applyKeyboard(lang, project.id) });
}

async function backToProjects(ctx) {
  await ctx.answerCbQuery();
  await showProjects(ctx);
}

module.exports = { showProjects, showProjectDetail, backToProjects };
