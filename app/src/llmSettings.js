const P = 'swt-llm-'

/** @typedef {{ enabled: boolean, provider: 'gemini' | 'groq' | 'deepseek', apiKey: string, modelGemini: string, modelGroq: string, modelDeepseek: string }} LlmSettings */
/** @typedef {{ enabled: boolean, apiKey: string, model: string }} RootLlmSettings */

/** @returns {LlmSettings} */
export function getLlmSettings() {
  try {
    return {
      enabled: localStorage.getItem(P + 'enabled') === '1',
      provider: /** @type {'gemini' | 'groq' | 'deepseek'} */ (
        localStorage.getItem(P + 'provider') || 'gemini'
      ),
      apiKey: localStorage.getItem(P + 'apikey') || '',
      modelGemini: localStorage.getItem(P + 'model-gemini') || 'gemini-2.0-flash-001',
      modelGroq: localStorage.getItem(P + 'model-groq') || 'llama-3.1-8b-instant',
      modelDeepseek: localStorage.getItem(P + 'model-deepseek') || 'deepseek-chat',
    }
  } catch {
    return {
      enabled: false,
      provider: 'gemini',
      apiKey: '',
      modelGemini: 'gemini-2.0-flash-001',
      modelGroq: 'llama-3.1-8b-instant',
      modelDeepseek: 'deepseek-chat',
    }
  }
}

/** @returns {RootLlmSettings} */
export function getRootLlmSettings() {
  try {
    return {
      enabled: localStorage.getItem(P + 'root-enabled') !== '0',
      apiKey: localStorage.getItem(P + 'root-apikey') || localStorage.getItem(P + 'apikey') || '',
      model: localStorage.getItem(P + 'root-model') || 'deepseek-chat',
    }
  } catch {
    return { enabled: true, apiKey: '', model: 'deepseek-chat' }
  }
}

/** @param {Partial<LlmSettings>} patch */
export function setLlmSettings(patch) {
  try {
    if (patch.enabled !== undefined) localStorage.setItem(P + 'enabled', patch.enabled ? '1' : '0')
    if (patch.provider !== undefined) localStorage.setItem(P + 'provider', patch.provider)
    if (patch.apiKey !== undefined) localStorage.setItem(P + 'apikey', patch.apiKey)
    if (patch.modelGemini !== undefined) localStorage.setItem(P + 'model-gemini', patch.modelGemini)
    if (patch.modelGroq !== undefined) localStorage.setItem(P + 'model-groq', patch.modelGroq)
    if (patch.modelDeepseek !== undefined) localStorage.setItem(P + 'model-deepseek', patch.modelDeepseek)
  } catch {
    /* ignore */
  }
}

/** @param {Partial<RootLlmSettings>} patch */
export function setRootLlmSettings(patch) {
  try {
    if (patch.enabled !== undefined) localStorage.setItem(P + 'root-enabled', patch.enabled ? '1' : '0')
    if (patch.apiKey !== undefined) localStorage.setItem(P + 'root-apikey', patch.apiKey)
    if (patch.model !== undefined) localStorage.setItem(P + 'root-model', patch.model)
  } catch {
    /* ignore */
  }
}
