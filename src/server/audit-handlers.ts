/**
 * Wires undo handlers into the audit registry. Imported once from the audit
 * sheet (which lives in the app shell) so the registry is populated on every
 * authenticated request.
 *
 * This is a generic skeleton: no domain undo handlers are registered yet.
 * Register handlers here as features are added, e.g.:
 *
 *   registerUndoHandler("widget.create", async (tx, action) => {
 *     await tx.widget.delete({ where: { id: action.entityId } });
 *   });
 */
// import { registerUndoHandler } from "@/server/audit";

let registered = false;

export function registerAllUndoHandlers() {
  if (registered) return;
  registered = true;
  // No undo handlers registered in the skeleton.
}
