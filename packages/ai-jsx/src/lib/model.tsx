export type ChatOrCompletionModelOrBoth<ValidChatModel extends string, ValidCompletionModel extends string> =
  | { chatModel: ValidChatModel; completionModel?: ValidCompletionModel }
  | { chatModel?: ValidChatModel; completionModel: ValidCompletionModel };
