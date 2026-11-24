/**
 * Utility to strip doctor prefixes like Dr., DR., Doctor, Prof., etc.
 * Returns only the person's actual name.
 */
export const stripDoctorTitle = (name) => {
  if (!name || typeof name !== "string") return "";
  return name
    .replace(/^(dr\.|dr|doctor|prof\.|prof|professor|د\.|د\/|دكتور)\s+/i, "")
    .trim();
};
