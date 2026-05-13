import { putRecord, deleteRecord, listAll } from '@/lib/storage/db';
import type { Recipe } from './executor';

export const RECIPE_STORE = 'customTools'; // share table; differentiate via _kind.

interface RecipeRow extends Recipe {
  _kind: 'recipe';
}

export async function loadRecipes(): Promise<Recipe[]> {
  const rows = await listAll<RecipeRow & { updatedAt: number }>(RECIPE_STORE);
  return rows
    .filter((r): r is RecipeRow & { updatedAt: number } => !!r && r._kind === 'recipe')
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((r) => {
      // Strip the discriminant before handing rows to callers.
      const rest = { ...r };
      delete (rest as { _kind?: unknown })._kind;
      return rest as Recipe;
    });
}

export async function saveRecipe(r: Recipe): Promise<void> {
  const row: RecipeRow = { ...r, updatedAt: Date.now(), _kind: 'recipe' };
  await putRecord(RECIPE_STORE, row);
}

export async function deleteRecipe(id: string): Promise<void> {
  await deleteRecord(RECIPE_STORE, id);
}
