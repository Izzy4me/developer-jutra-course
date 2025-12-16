// Lightweight wrapper exporting the existing global CONFIG.
// This preserves original behavior while enabling ES module imports.
const _CONFIG = typeof window !== 'undefined' && window.CONFIG ? window.CONFIG : {};
export const CONFIG = _CONFIG;
export default CONFIG;
