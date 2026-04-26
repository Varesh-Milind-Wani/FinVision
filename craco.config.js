/* eslint-disable @typescript-eslint/no-var-requires */

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Ensure TS/TSX resolution even when CRA doesn't auto-detect TypeScript.
      webpackConfig.resolve = webpackConfig.resolve || {};
      const exts = Array.isArray(webpackConfig.resolve.extensions) ? webpackConfig.resolve.extensions : [];
      const nextExts = ['.ts', '.tsx', ...exts.filter((e) => e !== '.ts' && e !== '.tsx')];
      webpackConfig.resolve.extensions = nextExts;

      // In this environment, spawning child processes with IPC can fail (EPERM),
      // which breaks CRA's ForkTsCheckerWebpackPlugin. We remove it and rely on
      // Babel transpilation for TS/TSX. Typechecking can be done separately via `tsc --noEmit`.
      webpackConfig.plugins = (webpackConfig.plugins || []).filter((p) => {
        const name = p?.constructor?.name || '';
        return name !== 'ForkTsCheckerWebpackPlugin';
      });
      return webpackConfig;
    },
  },
};
