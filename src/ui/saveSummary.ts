// What a save file holds, in words — "Café: Employee · The Counter". Shown on
// the save card so a player loading it knows which moment they are going back
// to. Reads the buildings' own shapes, which is why it lives with the UI rather
// than in the save module: the framework stores blobs, it does not read them.
import { ROLE_LABEL, stageById } from "@/buildings/cafe/journey";
import type { ManualSave } from "@/framework/saves/manualSave";

export function describeSave(save: ManualSave): string[] {
  const lines: string[] = [];

  const cafe = save.sessions.cafe as { stageId?: unknown; role?: unknown } | undefined;
  if (cafe && typeof cafe.stageId === "string") {
    const stage = stageById(cafe.stageId);
    const role =
      typeof cafe.role === "string" ? ROLE_LABEL[cafe.role as keyof typeof ROLE_LABEL] : "";
    if (stage?.kind === "exit") lines.push("Café: career finished");
    else if (stage) lines.push(`Café: ${role ? `${role} · ` : ""}${stage.title}`);
  }

  const maison = save.maison as { decided?: unknown } | null;
  if (maison && Array.isArray(maison.decided) && maison.decided.length > 0) {
    const n = maison.decided.length;
    lines.push(`MAISON: ${n} ${n === 1 ? "beat" : "beats"} decided`);
  }

  if (lines.length === 0) lines.push("The start of the game");
  return lines;
}
