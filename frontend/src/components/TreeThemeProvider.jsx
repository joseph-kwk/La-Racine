/**
 * components/TreeThemeProvider.jsx
 *
 * Injects a family tree's theme colors as CSS custom properties
 * on a scoped div wrapper. Any child component can reference:
 *
 *   var(--tree-primary)   — main accent color
 *   var(--tree-dark)      — dark shade (heroes, deep bg)
 *   var(--tree-mid)       — mid tone (highlights, chips)
 *   var(--tree-light)     — very light tint (backgrounds)
 *   var(--tree-gradient)  — ready-made gradient string
 *
 * Usage:
 *   <TreeThemeProvider tree={treeObject}>
 *     <YourTreeContent />
 *   </TreeThemeProvider>
 */

import React from 'react';
import { resolveTheme } from '../data/themePresets';

const TreeThemeProvider = ({ tree, children, className = '' }) => {
  const theme = resolveTheme(tree);

  const cssVars = {
    '--tree-primary':  theme.primary,
    '--tree-dark':     theme.dark,
    '--tree-mid':      theme.mid,
    '--tree-light':    theme.light,
    '--tree-gradient': `linear-gradient(135deg, ${theme.dark} 0%, ${theme.primary} 100%)`,
  };

  return (
    <div className={`tree-themed ${className}`} style={cssVars}>
      {children}
    </div>
  );
};

export default TreeThemeProvider;
