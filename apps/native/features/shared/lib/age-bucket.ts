/** Postpartum / child age buckets for stage-aware UI (doc §3.3). */
export type AgeBucket =
  | "NB_0_3m"
  | "I_3_6m"
  | "I_6_12m"
  | "T_12_24m"
  | "K_2_6y"
  | "UNKNOWN";

export function ageBucketFromDob(dobIso: string, today = new Date()): AgeBucket {
  const dob = new Date(`${dobIso}T12:00:00`);
  if (Number.isNaN(dob.getTime())) return "UNKNOWN";
  const msPerDay = 24 * 60 * 60 * 1000;
  const days = Math.floor((today.getTime() - dob.getTime()) / msPerDay);
  if (days < 0) return "UNKNOWN";
  const months = days / 30.4375;
  if (months < 3) return "NB_0_3m";
  if (months < 6) return "I_3_6m";
  if (months < 12) return "I_6_12m";
  if (months < 24) return "T_12_24m";
  if (months < 72) return "K_2_6y";
  return "K_2_6y";
}

export function ageBucketLabel(bucket: AgeBucket): string {
  switch (bucket) {
    case "NB_0_3m":
      return "0–3 months";
    case "I_3_6m":
      return "3–6 months";
    case "I_6_12m":
      return "6–12 months";
    case "T_12_24m":
      return "12–24 months";
    case "K_2_6y":
      return "2–6 years";
    default:
      return "Finish setup";
  }
}

export function approximateAgeLabel(dobIso: string, today = new Date()): string {
  const dob = new Date(`${dobIso}T12:00:00`);
  if (Number.isNaN(dob.getTime())) return "Unknown age";
  const msPerDay = 24 * 60 * 60 * 1000;
  const days = Math.max(0, Math.floor((today.getTime() - dob.getTime()) / msPerDay));
  if (days < 14) return `${days} days`;
  const weeks = Math.floor(days / 7);
  if (weeks < 13) return `${weeks} weeks`;
  const months = Math.floor(days / 30.4375);
  if (months < 24) return `${months} months`;
  const years = Math.floor(months / 12);
  return `${years} years`;
}
