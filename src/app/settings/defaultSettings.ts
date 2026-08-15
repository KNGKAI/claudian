import { getDefaultHiddenProviderCommands } from '../../core/providers/commands/hiddenCommands';
import { DEFAULT_REASONING_VALUE } from '../../core/providers/reasoning';
import { type ClaudianSettings, type SuggestedPrompt } from '../../core/types/settings';
import { getBuiltInProviderDefaultConfigs } from '../../providers/defaultProviderConfigs';

const DEFAULT_SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  { id: 'summarize', label: 'Summarize', prompt: 'Summarize the key points of this note.' },
  { id: 'improve-writing', label: 'Improve writing', prompt: 'Improve the writing in this note. Keep the meaning and tone intact.' },
  { id: 'explain-code', label: 'Explain code', prompt: 'Explain what the code in this note does, step by step.' },
  { id: 'refactor', label: 'Refactor', prompt: 'Refactor the code in this note to be cleaner and easier to maintain.' },
];

export const DEFAULT_CLAUDIAN_SETTINGS: ClaudianSettings = {
  userName: '',

  permissionMode: 'yolo',

  model: 'haiku',
  thinkingBudget: 'off',
  effortLevel: DEFAULT_REASONING_VALUE,
  serviceTier: 'default',
  enableAutoTitleGeneration: true,
  titleGenerationLocale: '',
  titleGenerationModel: '',

  excludedTags: [],
  mediaFolder: '',
  systemPrompt: '',
  persistentExternalContextPaths: [],

  sharedEnvironmentVariables: '',
  envSnippets: [],
  customContextLimits: {},
  customModelAliases: {},

  keyboardNavigation: {
    scrollUpKey: 'w',
    scrollDownKey: 's',
    focusInputKey: 'i',
  },
  requireCommandOrControlEnterToSend: false,

  locale: 'en',

  providerConfigs: getBuiltInProviderDefaultConfigs(),

  settingsProvider: 'claude',
  lastSelectedChatModel: null,
  savedProviderModel: {},
  savedProviderEffort: {},
  savedProviderServiceTier: {},
  savedProviderThinkingBudget: {},
  savedProviderPermissionMode: {},
  pendingProviderSessionInvalidations: {},

  lastCustomModel: '',

  maxWarmAgentProcesses: 5,
  enableAutoScroll: true,
  deferMathRenderingDuringStreaming: true,
  expandFileEditsByDefault: false,
  chatViewPlacement: 'right-sidebar',
  enableDualPane: true,
  enableFilePane: true,
  dualPaneSide: 'right',
  sessionManagerOrganization: 'list',
  sessionManagerSort: 'last-updated',
  pinnedLinkedNotePaths: [],

  hiddenProviderCommands: getDefaultHiddenProviderCommands(),
  suggestedPrompts: DEFAULT_SUGGESTED_PROMPTS,
};
