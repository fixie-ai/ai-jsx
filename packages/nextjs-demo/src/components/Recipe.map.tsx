import { makeComponentMap } from 'ai-jsx/react/map';
import {
  Recipe,
  RecipeIngredientList,
  RecipeIngredientListItem,
  RecipeInstructionList,
  RecipeInstructionListItem,
  RecipeTitle,
  SelectIngredientsButton,
} from './Recipe';

export default makeComponentMap({
  Recipe,
  RecipeTitle,
  RecipeInstructionList,
  RecipeIngredientList,
  SelectIngredientsButton,
  RecipeIngredientListItem,
  RecipeInstructionListItem,
});
