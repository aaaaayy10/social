import enrollment from "@/data/course-enrollment.json";

export const participation = {
  asOf: enrollment.asOf,
  months: 8,
  weeksPerMonth: 4.35,
  sessionsPerWeek: 1.5,
  programs: enrollment.programs.length,
  registered: enrollment.programs.reduce((sum, row) => sum + (row.applications ?? 0), 0),
};
export const operatingWeeks = Number((participation.months * participation.weeksPerMonth).toFixed(2));
export const sessionsPerProgram = Number((operatingWeeks * participation.sessionsPerWeek).toFixed(2));
export const estimateParticipation = (registrants: number) => Math.round(registrants * sessionsPerProgram);
export const estimatedParticipation = estimateParticipation(participation.registered);

