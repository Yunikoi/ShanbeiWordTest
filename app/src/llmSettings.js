const P = 'swt-llm-'

/** @typedef {{ enabled: boolean, provider: 'gemini' | 'groq', apiKey: string, modelGemini: string, modelGroq: string }} LlmSettings */

/** @returns {LlmSettings} */
export function getLlmSettings() {
  try {
    return {
      enabled: localStorage.getItem(P + 'enabled') === '1',
      provider: /** @type {'gemini' | 'groq'} */ (localStorage.getItem(P + 'provider') || 'gemini'),
      apiKey: localStorage.getItem(P + 'apikey') || '',
      modelGemini: localStorage.getItem(P + 'model-gemini') || 'gemini-2.0-flash-001',
      modelGroq: localStorage.getItem(P + 'model-groq') || 'llama-3.1-8b-instant',
    }
  } catch {
    return {
      enabled: false,
      provider: 'gemini',
      apiKey: '',
      modelGemini: 'gemini-2.0-flash',
      modelGroq: 'llama-3.1-8b-instant',
    }
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
  } catch {
    /* ignore */
  }
}
