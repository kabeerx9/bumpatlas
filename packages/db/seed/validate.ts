import prisma from "../src/index";

/**
 * Beta gate for content inventory (§ Phase 3).
 *
 * Exits non-zero until every category has enough **published** items. This is meant to
 * fail today: most categories are health-adjacent and cannot publish until a named
 * reviewer signs them off, so the shortfall it prints is the real content-operations
 * backlog rather than a bug.
 *
 * Wiring it up now means the gate cannot be forgotten later, when the pressure to ship
 * is higher and an empty Care card looks like a rendering glitch rather than missing
 * clinical review.
 */

const REQUIREMENTS = [
  { label: "pregnancy week cards", required: 40, count: () => countContent("PREGNANCY_WEEK_CARD") },
  { label: "parenting tips", required: 60, count: () => countContent("PARENTING_TIP") },
  { label: "parent wellness cards", required: 30, count: () => countContent("PARENT_WELLNESS_CARD") },
  { label: "memory prompts", required: 90, count: () => countContent("MEMORY_PROMPT") },
  { label: "AI safe-answer snippets", required: 50, count: () => countContent("AI_SNIPPET") },
  {
    label: "wellness micro-actions",
    required: 60,
    count: () =>
      prisma.wellnessAction.count({ where: { isPublished: true, withdrawnAt: null } }),
  },
  {
    label: "milestone definitions",
    required: 30,
    count: () => prisma.milestoneDefinition.count({ where: { isPublished: true } }),
  },
] as const;

function countContent(type: Parameters<typeof prisma.contentItem.count>[0] extends never ? never : string) {
  return prisma.contentItem.count({
    where: {
      type: type as never,
      isPublished: true,
      withdrawnAt: null,
    },
  });
}

async function main() {
  const rows = await Promise.all(
    REQUIREMENTS.map(async (requirement) => ({
      label: requirement.label,
      required: requirement.required,
      actual: await requirement.count(),
    })),
  );

  const shortfalls = rows.filter((row) => row.actual < row.required);

  console.log("Published content inventory\n");
  for (const row of rows) {
    const status = row.actual >= row.required ? "ok  " : "SHORT";
    console.log(`  ${status} ${row.label}: ${row.actual}/${row.required}`);
  }

  /**
   * Also surfaced separately: items sitting unpublished purely because review has not
   * happened. This is the number a founder can act on.
   */
  const [awaitingActions, awaitingMilestones] = await Promise.all([
    prisma.wellnessAction.count({ where: { isPublished: false, reviewerName: null } }),
    prisma.milestoneDefinition.count({ where: { isPublished: false, reviewerName: null } }),
  ]);

  if (awaitingActions + awaitingMilestones > 0) {
    console.log(
      `\n${awaitingActions} wellness actions and ${awaitingMilestones} milestone definitions are ` +
        "written but unpublished because they have no named reviewer.",
    );
  }

  if (shortfalls.length > 0) {
    console.error(
      `\nLaunch inventory not met: ${shortfalls.map((row) => row.label).join(", ")}.`,
    );
    process.exit(1);
  }

  console.log("\nLaunch inventory met.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
