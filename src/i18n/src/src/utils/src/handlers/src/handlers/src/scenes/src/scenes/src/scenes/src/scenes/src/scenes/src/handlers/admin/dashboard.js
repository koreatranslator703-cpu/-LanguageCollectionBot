const { Markup } = require('telegraf');
const prisma = require('../../db');
const { t } = require('../../i18n');
const { adminMenuKeyboard, backToAdminKeyboard } = require('../../keyboards');

async function requireAdmin(ctx) {
  const lang = ctx.state.lang || 'en';
  if (!ctx.state.user.isAdmin) {
    await ctx.reply(t(lang, 'admin_only'));
    return false;
  }
  return true;
}

async function showDashboard(ctx) {
  if (!(await requireAdmin(ctx))) return;
  const lang = ctx.state.lang || 'en';
  await ctx.reply(t(lang, 'admin_dashboard'), adminMenuKeyboard(lang));
}

async function showDashboardCb(ctx) {
  await ctx.answerCbQuery();
  await showDashboard(ctx);
}

async function listProjectsForEdit(ctx) {
  await ctx.answerCbQuery();
  if (!(await requireAdmin(ctx))) return;
  const lang = ctx.state.lang || 'en';
  const projects = await prisma.project.findMany({ orderBy: { createdAt: 'asc' } });
  if (projects.length === 0) return ctx.reply(t(lang, 'admin_no_projects'), backToAdminKeyboard(lang));

  const kb = Markup.inlineKeyboard(
    projects.map((p) => [Markup.button.callback(`${p.isActive ? '🟢' : '⚪'} ${p.title}`, `EDITPROJ_${p.id}`)])
  );
  await ctx.reply(t(lang, 'admin_select_project_edit'), kb);
}

async function listProjectsForDelete(ctx) {
  await ctx.answerCbQuery();
  if (!(await requireAdmin(ctx))) return;
  const lang = ctx.state.lang || 'en';
  const projects = await prisma.project.findMany({ orderBy: { createdAt: 'asc' } });
  if (projects.length === 0) return ctx.reply(t(lang, 'admin_no_projects'), backToAdminKeyboard(lang));

  const kb = Markup.inlineKeyboard(projects.map((p) => [Markup.button.callback(p.title, `DELPROJ_${p.id}`)]));
  await ctx.reply(t(lang, 'admin_select_project_delete'), kb);
}

async function confirmDeleteProject(ctx) {
  await ctx.answerCbQuery();
  if (!(await requireAdmin(ctx))) return;
  const lang = ctx.state.lang || 'en';
  const id = Number(ctx.match[1]);
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return;

  const kb = Markup.inlineKeyboard([
    [Markup.button.callback(t(lang, 'yes_button'), `DELCONFIRM_${id}`)],
    [Markup.button.callback(t(lang, 'no_button'), 'ADMIN_HOME')],
  ]);
  await ctx.reply(t(lang, 'admin_confirm_delete', { title: project.title }), kb);
}

async function deleteProject(ctx) {
  await ctx.answerCbQuery();
  if (!(await requireAdmin(ctx))) return;
  const lang = ctx.state.lang || 'en';
  const id = Number(ctx.match[1]);
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return;

  await prisma.project.delete({ where: { id } });
  await ctx.reply(t(lang, 'admin_project_deleted', { title: project.title }), backToAdminKeyboard(lang));
}

module.exports = {
  requireAdmin,
  showDashboard,
  showDashboardCb,
  listProjectsForEdit,
  listProjectsForDelete,
  confirmDeleteProject,
  deleteProject,
};
