/**
 * Helper for model components. This type is used to create prop types that must include at least a chatModel or a completionModel.
 *
 * @hidden
 */
export type ChatOrCompletionModelOrBoth<ValidChatModel extends string, ValidCompletionModel extends string> =
  | { chatModel: ValidChatModel; completionModel?: ValidCompletionModel }
  | { chatModel?: ValidChatModel; completionModel: ValidCompletionModel };
