/* @ds-bundle: {"format":4,"namespace":"FIBIDesignSystem_383abe","components":[{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Logo","sourcePath":"components/core/Logo.jsx"},{"name":"Tag","sourcePath":"components/core/Tag.jsx"},{"name":"Dialog","sourcePath":"components/feedback/Dialog.jsx"},{"name":"EmptyState","sourcePath":"components/feedback/EmptyState.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast.jsx"},{"name":"Tooltip","sourcePath":"components/feedback/Tooltip.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Field","sourcePath":"components/forms/Field.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Radio","sourcePath":"components/forms/Radio.jsx"},{"name":"SearchField","sourcePath":"components/forms/SearchField.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Textarea","sourcePath":"components/forms/Textarea.jsx"},{"name":"TabBar","sourcePath":"components/navigation/TabBar.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"},{"name":"TopBar","sourcePath":"components/navigation/TopBar.jsx"},{"name":"CollectionTile","sourcePath":"components/places/CollectionTile.jsx"},{"name":"MapSurface","sourcePath":"components/places/MapSurface.jsx"},{"name":"PinMarker","sourcePath":"components/places/PinMarker.jsx"},{"name":"PlaceCard","sourcePath":"components/places/PlaceCard.jsx"}],"sourceHashes":{"components/core/Badge.jsx":"c0e66f0893d5","components/core/Button.jsx":"eeb0b69d1713","components/core/Card.jsx":"1345383e9712","components/core/Icon.jsx":"6058b15a82dc","components/core/IconButton.jsx":"195dd5b6e52d","components/core/Logo.jsx":"4e3e2e6423c5","components/core/Tag.jsx":"629ef09622f1","components/feedback/Dialog.jsx":"f7169063cafb","components/feedback/EmptyState.jsx":"0acddfeb9ad7","components/feedback/Toast.jsx":"461955a3a0b3","components/feedback/Tooltip.jsx":"f2ddc622ad98","components/forms/Checkbox.jsx":"b6f4e4e0232e","components/forms/Field.jsx":"7172090d8fe6","components/forms/Input.jsx":"16778cbcc491","components/forms/Radio.jsx":"93b15064080b","components/forms/SearchField.jsx":"f1323094d9d3","components/forms/Select.jsx":"a21202720f41","components/forms/Switch.jsx":"65a5302e44b4","components/forms/Textarea.jsx":"f48d5e9c2d31","components/navigation/TabBar.jsx":"916a99e3f717","components/navigation/Tabs.jsx":"6c507e3c7060","components/navigation/TopBar.jsx":"707295454a65","components/places/CollectionTile.jsx":"9f158f278921","components/places/MapSurface.jsx":"053d15b548c5","components/places/PinMarker.jsx":"cbdaa48cdc7a","components/places/PlaceCard.jsx":"ac1a2db0e451","ui_kits/app/Screens.jsx":"56be308fdc23","ui_kits/app/ios-frame.jsx":"24642b887be3","ui_kits/marketing/Sections.jsx":"bea4ee7d5468"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.FIBIDesignSystem_383abe = window.FIBIDesignSystem_383abe || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const tones = {
  neutral: {
    background: "var(--bg-inset)",
    color: "var(--text-secondary)"
  },
  info: {
    background: "var(--status-info-bg)",
    color: "var(--status-info-fg)"
  },
  success: {
    background: "var(--status-success-bg)",
    color: "var(--status-success-fg)"
  },
  warn: {
    background: "var(--status-warn-bg)",
    color: "var(--status-warn-fg)"
  },
  danger: {
    background: "var(--status-danger-bg)",
    color: "var(--status-danger-fg)"
  },
  brand: {
    background: "var(--gradient-brand)",
    color: "var(--indigo-900)"
  }
};
function Badge({
  tone = "neutral",
  icon,
  style,
  children,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      height: 24,
      padding: "0 10px",
      borderRadius: "var(--radius-pill)",
      font: "var(--type-caption)",
      fontWeight: "var(--fw-medium)",
      ...tones[tone],
      ...style
    }
  }, rest), icon, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const base = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  fontFamily: "var(--font-sans)",
  fontWeight: "var(--fw-medium)",
  letterSpacing: "var(--ls-normal)",
  borderRadius: "var(--radius-pill)",
  border: "var(--border-hairline) solid transparent",
  cursor: "pointer",
  whiteSpace: "nowrap",
  transition: "var(--transition-control)",
  textDecoration: "none"
};
const sizes = {
  sm: {
    height: "var(--control-h-sm)",
    padding: "0 14px",
    fontSize: "var(--fs-sm)"
  },
  md: {
    height: "var(--control-h-md)",
    padding: "0 20px",
    fontSize: "var(--fs-body)"
  },
  lg: {
    height: "var(--control-h-lg)",
    padding: "0 28px",
    fontSize: "var(--fs-body-lg)"
  }
};
const variants = {
  primary: {
    background: "var(--accent)",
    color: "var(--accent-fg)",
    boxShadow: "var(--shadow-sm)"
  },
  gradient: {
    background: "var(--gradient-brand)",
    color: "var(--indigo-900)",
    boxShadow: "var(--shadow-md)"
  },
  secondary: {
    background: "var(--bg-surface)",
    color: "var(--text-primary)",
    borderColor: "var(--border-default)"
  },
  ghost: {
    background: "transparent",
    color: "var(--text-secondary)"
  },
  soft: {
    background: "var(--accent-soft)",
    color: "var(--sky-700)"
  },
  danger: {
    background: "var(--red-500)",
    color: "#fff"
  }
};
function Button({
  variant = "primary",
  size = "md",
  iconLeft,
  iconRight,
  fullWidth,
  disabled,
  href,
  onClick,
  style,
  children,
  ...rest
}) {
  const [h, setH] = React.useState(false);
  const [p, setP] = React.useState(false);
  const hoverFx = {
    primary: {
      background: "var(--accent-hover)"
    },
    gradient: {
      filter: "brightness(1.04)"
    },
    secondary: {
      background: "var(--bg-subtle)",
      borderColor: "var(--border-strong)"
    },
    ghost: {
      background: "var(--bg-inset)",
      color: "var(--text-primary)"
    },
    soft: {
      background: "var(--sky-200)"
    },
    danger: {
      background: "var(--red-700)"
    }
  };
  const s = {
    ...base,
    ...sizes[size],
    ...variants[variant],
    ...(h && !disabled ? hoverFx[variant] : null),
    width: fullWidth ? "100%" : undefined,
    transform: p && !disabled ? "scale(var(--press-scale))" : "none",
    opacity: disabled ? .45 : 1,
    pointerEvents: disabled ? "none" : undefined,
    ...style
  };
  const Tag = href ? "a" : "button";
  return /*#__PURE__*/React.createElement(Tag, _extends({
    href: href,
    onClick: onClick,
    disabled: Tag === "button" ? disabled : undefined,
    style: s,
    onMouseEnter: () => setH(true),
    onMouseLeave: () => {
      setH(false);
      setP(false);
    },
    onMouseDown: () => setP(true),
    onMouseUp: () => setP(false)
  }, rest), iconLeft, children, iconRight);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Card({
  elevation = "sm",
  interactive,
  padding = "var(--space-7)",
  tone = "surface",
  style,
  children,
  ...rest
}) {
  const [h, setH] = React.useState(false);
  const shadows = {
    none: "none",
    sm: "var(--shadow-sm)",
    md: "var(--shadow-md)",
    lg: "var(--shadow-lg)"
  };
  const tones = {
    surface: {
      background: "var(--surface-card)",
      border: "var(--border-hairline) solid var(--border-subtle)"
    },
    subtle: {
      background: "var(--bg-subtle)",
      border: "var(--border-hairline) solid transparent"
    },
    night: {
      background: "var(--gradient-night)",
      border: "var(--border-hairline) solid var(--indigo-700)",
      color: "#F2F3F8"
    },
    brand: {
      background: "var(--gradient-brand-soft)",
      border: "var(--border-hairline) solid transparent"
    }
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: {
      borderRadius: "var(--radius-card)",
      padding,
      transition: "var(--transition-surface)",
      boxShadow: h && interactive ? shadows.lg : shadows[elevation],
      transform: h && interactive ? "translateY(-2px)" : "none",
      cursor: interactive ? "pointer" : undefined,
      ...tones[tone],
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Lucide is loaded from CDN by the host page; this wrapper renders the glyph and
   re-runs lucide.createIcons() so React-rendered nodes get replaced. */
function Icon({
  name,
  size = 18,
  strokeWidth = 1.75,
  color = "currentColor",
  style,
  ...rest
}) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const l = typeof window !== "undefined" && window.lucide;
    if (l && ref.current) l.createIcons({
      attrs: {
        width: size,
        height: size,
        "stroke-width": strokeWidth
      },
      nameAttr: "data-lucide",
      icons: l.icons
    });
  });
  return /*#__PURE__*/React.createElement("span", {
    ref: ref,
    style: {
      display: "inline-flex",
      width: size,
      height: size,
      color,
      flex: "0 0 auto",
      ...style
    }
  }, /*#__PURE__*/React.createElement("i", _extends({
    "data-lucide": name,
    style: {
      width: size,
      height: size
    }
  }, rest)));
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const sz = {
  sm: 32,
  md: 40,
  lg: 48
};
function IconButton({
  icon,
  label,
  variant = "ghost",
  size = "md",
  disabled,
  onClick,
  style,
  ...rest
}) {
  const [h, setH] = React.useState(false);
  const v = {
    ghost: {
      background: h ? "var(--bg-inset)" : "transparent",
      color: "var(--text-secondary)"
    },
    surface: {
      background: "var(--bg-surface)",
      color: "var(--text-primary)",
      boxShadow: "var(--shadow-sm)",
      border: "var(--border-hairline) solid var(--border-subtle)"
    },
    glass: {
      background: "var(--surface-glass)",
      backdropFilter: "var(--blur-glass)",
      WebkitBackdropFilter: "var(--blur-glass)",
      color: "var(--text-primary)",
      boxShadow: "var(--shadow-sm)"
    },
    accent: {
      background: h ? "var(--accent-hover)" : "var(--accent)",
      color: "var(--accent-fg)",
      boxShadow: "var(--shadow-sm)"
    }
  }[variant];
  return /*#__PURE__*/React.createElement("button", _extends({
    "aria-label": label,
    title: label,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: {
      width: sz[size],
      height: sz[size],
      display: "inline-grid",
      placeItems: "center",
      borderRadius: "var(--radius-circle)",
      border: "none",
      cursor: "pointer",
      transition: "var(--transition-control)",
      opacity: disabled ? .4 : 1,
      ...v,
      ...style
    }
  }, rest), icon);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/Logo.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Logo({
  variant = "mark",
  height = 32,
  src,
  style,
  ...rest
}) {
  const file = src || {
    mark: "fibi-mark.png",
    full: "fibi-logo-full.png",
    dark: "fibi-logo-dark.png",
    light: "fibi-logo-light.png"
  }[variant];
  const base = typeof window !== "undefined" && window.FIBI_ASSETS || "assets/";
  return /*#__PURE__*/React.createElement("img", _extends({
    src: base + file,
    alt: "FIBI",
    style: {
      height,
      width: "auto",
      display: "block",
      ...style
    }
  }, rest));
}
Object.assign(__ds_scope, { Logo });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Logo.jsx", error: String((e && e.message) || e) }); }

// components/core/Tag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Tag({
  selected,
  interactive,
  icon,
  onRemove,
  onClick,
  style,
  children,
  ...rest
}) {
  const [h, setH] = React.useState(false);
  return /*#__PURE__*/React.createElement("span", _extends({
    onClick: onClick,
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      height: 32,
      padding: onRemove ? "0 8px 0 12px" : "0 14px",
      borderRadius: "var(--radius-chip)",
      font: "var(--type-label)",
      cursor: interactive ? "pointer" : "default",
      transition: "var(--transition-control)",
      background: selected ? "var(--indigo-900)" : h && interactive ? "var(--bg-inset)" : "var(--bg-surface)",
      color: selected ? "var(--text-inverse)" : "var(--text-secondary)",
      border: "var(--border-hairline) solid " + (selected ? "transparent" : "var(--border-subtle)"),
      ...style
    }
  }, rest), icon, children, onRemove && /*#__PURE__*/React.createElement("button", {
    onClick: e => {
      e.stopPropagation();
      onRemove(e);
    },
    "aria-label": "Remove",
    style: {
      border: "none",
      background: "transparent",
      cursor: "pointer",
      color: "inherit",
      opacity: .6,
      fontSize: 14,
      lineHeight: 1,
      padding: "2px 4px"
    }
  }, "\xD7"));
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tag.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Dialog.jsx
try { (() => {
function Dialog({
  open,
  onClose,
  title,
  description,
  footer,
  variant = "center",
  width = 440,
  children
}) {
  if (!open) return null;
  const sheet = variant === "sheet";
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: "fixed",
      inset: 0,
      zIndex: 60,
      background: "var(--bg-scrim)",
      backdropFilter: "blur(3px)",
      display: "flex",
      alignItems: sheet ? "flex-end" : "center",
      justifyContent: "center",
      padding: sheet ? 0 : "var(--space-7)",
      animation: "fibiFade var(--dur-base) var(--ease-out)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      width: sheet ? "100%" : width,
      maxWidth: "100%",
      background: "var(--bg-surface)",
      borderRadius: sheet ? "var(--radius-sheet) var(--radius-sheet) 0 0" : "var(--radius-card)",
      boxShadow: "var(--shadow-xl)",
      padding: "var(--space-8)",
      animation: (sheet ? "fibiRise" : "fibiPop") + " var(--dur-slow) var(--ease-out)"
    }
  }, sheet && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 4,
      borderRadius: 2,
      background: "var(--neutral-300)",
      margin: "-8px auto var(--space-6)"
    }
  }), title && /*#__PURE__*/React.createElement("h3", {
    style: {
      font: "var(--type-h3)",
      letterSpacing: "var(--ls-tight)",
      margin: "0 0 var(--space-3)"
    }
  }, title), description && /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--type-body)",
      color: "var(--text-secondary)",
      margin: "0 0 var(--space-7)"
    }
  }, description), children, footer && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "var(--space-4)",
      justifyContent: "flex-end",
      marginTop: "var(--space-8)"
    }
  }, footer)), /*#__PURE__*/React.createElement("style", null, "@keyframes fibiFade{from{opacity:0}to{opacity:1}}@keyframes fibiPop{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:none}}@keyframes fibiRise{from{transform:translateY(100%)}to{transform:none}}"));
}
Object.assign(__ds_scope, { Dialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Dialog.jsx", error: String((e && e.message) || e) }); }

// components/feedback/EmptyState.jsx
try { (() => {
function EmptyState({
  icon,
  title,
  description,
  action,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
      gap: "var(--space-5)",
      padding: "var(--space-11) var(--space-7)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 64,
      height: 64,
      borderRadius: "var(--radius-circle)",
      display: "grid",
      placeItems: "center",
      background: "var(--gradient-brand-soft)",
      color: "var(--sky-600)"
    }
  }, icon), /*#__PURE__*/React.createElement("h3", {
    style: {
      font: "var(--type-h3)",
      letterSpacing: "var(--ls-tight)",
      margin: 0
    }
  }, title), description && /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--type-body)",
      color: "var(--text-secondary)",
      margin: 0,
      maxWidth: 320,
      textWrap: "pretty"
    }
  }, description), action && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "var(--space-3)"
    }
  }, action));
}
Object.assign(__ds_scope, { EmptyState });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/EmptyState.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Toast.jsx
try { (() => {
const tones = {
  neutral: {
    background: "var(--indigo-900)",
    color: "#fff"
  },
  success: {
    background: "var(--green-500)",
    color: "#fff"
  },
  danger: {
    background: "var(--red-500)",
    color: "#fff"
  }
};
function Toast({
  tone = "neutral",
  icon,
  action,
  onAction,
  style,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "var(--space-5)",
      padding: "12px 16px",
      borderRadius: "var(--radius-lg)",
      boxShadow: "var(--shadow-lg)",
      font: "var(--type-body)",
      ...tones[tone],
      ...style
    }
  }, icon, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, children), action && /*#__PURE__*/React.createElement("button", {
    onClick: onAction,
    style: {
      border: "none",
      background: "transparent",
      color: "inherit",
      font: "var(--type-label)",
      textDecoration: "underline",
      cursor: "pointer",
      opacity: .85
    }
  }, action));
}
Object.assign(__ds_scope, { Toast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Toast.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Tooltip.jsx
try { (() => {
function Tooltip({
  label,
  placement = "top",
  children
}) {
  const [s, setS] = React.useState(false);
  const pos = {
    top: {
      bottom: "calc(100% + 8px)",
      left: "50%",
      transform: "translateX(-50%)"
    },
    bottom: {
      top: "calc(100% + 8px)",
      left: "50%",
      transform: "translateX(-50%)"
    },
    right: {
      left: "calc(100% + 8px)",
      top: "50%",
      transform: "translateY(-50%)"
    }
  }[placement];
  return /*#__PURE__*/React.createElement("span", {
    style: {
      position: "relative",
      display: "inline-flex"
    },
    onMouseEnter: () => setS(true),
    onMouseLeave: () => setS(false)
  }, children, s && /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      ...pos,
      whiteSpace: "nowrap",
      background: "var(--indigo-900)",
      color: "#fff",
      font: "var(--type-caption)",
      padding: "6px 10px",
      borderRadius: "var(--radius-sm)",
      boxShadow: "var(--shadow-md)",
      zIndex: 40,
      pointerEvents: "none"
    }
  }, label));
}
Object.assign(__ds_scope, { Tooltip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Tooltip.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Checkbox({
  checked,
  onChange,
  label,
  disabled,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      cursor: disabled ? "default" : "pointer",
      opacity: disabled ? .45 : 1,
      font: "var(--type-body)",
      color: "var(--text-primary)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "checkbox",
    checked: !!checked,
    disabled: disabled,
    onChange: e => onChange && onChange(e.target.checked, e),
    style: {
      position: "absolute",
      opacity: 0,
      width: 0,
      height: 0
    }
  }, rest)), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 20,
      height: 20,
      borderRadius: "var(--radius-xs)",
      display: "grid",
      placeItems: "center",
      transition: "var(--transition-control)",
      background: checked ? "var(--accent)" : "var(--bg-surface)",
      border: "var(--border-hairline) solid " + (checked ? "var(--accent)" : "var(--border-default)")
    }
  }, checked && /*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "12",
    viewBox: "0 0 12 12",
    fill: "none"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M2.5 6.2 4.8 8.5 9.5 3.8",
    stroke: "#fff",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }))), label);
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Field.jsx
try { (() => {
/* Shared label + hint + error wrapper used by every form control. */
function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  style,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-3)",
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: htmlFor,
    style: {
      font: "var(--type-label)",
      color: "var(--text-secondary)"
    }
  }, label, required && /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--red-500)"
    }
  }, " *")), children, (error || hint) && /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-caption)",
      color: error ? "var(--red-500)" : "var(--text-tertiary)"
    }
  }, error || hint));
}
Object.assign(__ds_scope, { Field });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Field.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Input({
  iconLeft,
  suffix,
  error,
  style,
  ...rest
}) {
  const [fc, setFc] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      display: "flex",
      alignItems: "center"
    }
  }, iconLeft && /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      left: 14,
      color: "var(--text-tertiary)",
      display: "flex"
    }
  }, iconLeft), /*#__PURE__*/React.createElement("input", _extends({
    onFocus: () => setFc(true),
    onBlur: () => setFc(false),
    style: {
      ...{
        width: "100%",
        height: "var(--control-h-md)",
        padding: "0 14px",
        borderRadius: "var(--radius-control)",
        border: "var(--border-hairline) solid var(--border-default)",
        background: "var(--bg-surface)",
        color: "var(--text-primary)",
        font: "var(--type-body)",
        outline: "none",
        transition: "var(--transition-control)"
      },
      paddingLeft: iconLeft ? 42 : 14,
      paddingRight: suffix ? 42 : 14,
      borderColor: error ? "var(--red-500)" : fc ? "var(--border-brand)" : "var(--border-default)",
      boxShadow: fc ? "var(--focus-ring)" : "none",
      ...style
    }
  }, rest)), suffix && /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      right: 14,
      color: "var(--text-tertiary)",
      display: "flex"
    }
  }, suffix));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Radio.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Radio({
  checked,
  onChange,
  label,
  name,
  value,
  disabled,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      cursor: disabled ? "default" : "pointer",
      opacity: disabled ? .45 : 1,
      font: "var(--type-body)",
      color: "var(--text-primary)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "radio",
    name: name,
    value: value,
    checked: !!checked,
    disabled: disabled,
    onChange: e => onChange && onChange(value, e),
    style: {
      position: "absolute",
      opacity: 0,
      width: 0,
      height: 0
    }
  }, rest)), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 20,
      height: 20,
      borderRadius: "var(--radius-circle)",
      display: "grid",
      placeItems: "center",
      transition: "var(--transition-control)",
      background: "var(--bg-surface)",
      border: "var(--border-thick) solid " + (checked ? "var(--accent)" : "var(--border-default)")
    }
  }, checked && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 9,
      height: 9,
      borderRadius: "var(--radius-circle)",
      background: "var(--accent)"
    }
  })), label);
}
Object.assign(__ds_scope, { Radio });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Radio.jsx", error: String((e && e.message) || e) }); }

// components/forms/SearchField.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function SearchField({
  value,
  onChange,
  onClear,
  placeholder = "Search places",
  style,
  ...rest
}) {
  const [fc, setFc] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      display: "flex",
      alignItems: "center",
      ...style
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.75",
    strokeLinecap: "round",
    style: {
      position: "absolute",
      left: 16,
      color: "var(--text-tertiary)"
    }
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "11",
    r: "7"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m20 20-3.5-3.5"
  })), /*#__PURE__*/React.createElement("input", _extends({
    value: value,
    onChange: e => onChange && onChange(e.target.value),
    placeholder: placeholder,
    onFocus: () => setFc(true),
    onBlur: () => setFc(false),
    style: {
      width: "100%",
      height: "var(--control-h-md)",
      padding: "0 40px 0 44px",
      borderRadius: "var(--radius-pill)",
      border: "var(--border-hairline) solid " + (fc ? "var(--border-brand)" : "transparent"),
      background: "var(--bg-inset)",
      color: "var(--text-primary)",
      font: "var(--type-body)",
      outline: "none",
      boxShadow: fc ? "var(--focus-ring)" : "none",
      transition: "var(--transition-control)"
    }
  }, rest)), value && /*#__PURE__*/React.createElement("button", {
    onClick: onClear,
    "aria-label": "Clear",
    style: {
      position: "absolute",
      right: 12,
      border: "none",
      background: "transparent",
      color: "var(--text-tertiary)",
      cursor: "pointer",
      fontSize: 16,
      lineHeight: 1
    }
  }, "\xD7"));
}
Object.assign(__ds_scope, { SearchField });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/SearchField.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Select({
  options = [],
  error,
  style,
  ...rest
}) {
  const [fc, setFc] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      display: "flex",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("select", _extends({
    onFocus: () => setFc(true),
    onBlur: () => setFc(false),
    style: {
      ...{
        width: "100%",
        height: "var(--control-h-md)",
        padding: "0 14px",
        borderRadius: "var(--radius-control)",
        border: "var(--border-hairline) solid var(--border-default)",
        background: "var(--bg-surface)",
        color: "var(--text-primary)",
        font: "var(--type-body)",
        outline: "none",
        transition: "var(--transition-control)"
      },
      appearance: "none",
      paddingRight: 38,
      borderColor: error ? "var(--red-500)" : fc ? "var(--border-brand)" : "var(--border-default)",
      boxShadow: fc ? "var(--focus-ring)" : "none",
      cursor: "pointer",
      ...style
    }
  }, rest), options.map(o => typeof o === "string" ? /*#__PURE__*/React.createElement("option", {
    key: o,
    value: o
  }, o) : /*#__PURE__*/React.createElement("option", {
    key: o.value,
    value: o.value
  }, o.label))), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      right: 14,
      pointerEvents: "none",
      color: "var(--text-tertiary)",
      fontSize: 11
    }
  }, "\u25BE"));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function Switch({
  checked,
  onChange,
  label,
  disabled,
  style
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 12,
      cursor: disabled ? "default" : "pointer",
      opacity: disabled ? .45 : 1,
      font: "var(--type-body)",
      color: "var(--text-primary)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    onClick: () => !disabled && onChange && onChange(!checked),
    role: "switch",
    "aria-checked": !!checked,
    style: {
      width: 44,
      height: 26,
      borderRadius: "var(--radius-pill)",
      padding: 3,
      display: "flex",
      alignItems: "center",
      justifyContent: checked ? "flex-end" : "flex-start",
      background: checked ? "var(--accent)" : "var(--neutral-300)",
      transition: "background-color var(--dur-base) var(--ease-standard)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 20,
      height: 20,
      borderRadius: "var(--radius-circle)",
      background: "#fff",
      boxShadow: "var(--shadow-sm)",
      transition: "transform var(--dur-base) var(--ease-out)"
    }
  })), label);
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/forms/Textarea.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Textarea({
  rows = 4,
  error,
  style,
  ...rest
}) {
  const [fc, setFc] = React.useState(false);
  return /*#__PURE__*/React.createElement("textarea", _extends({
    rows: rows,
    onFocus: () => setFc(true),
    onBlur: () => setFc(false),
    style: {
      width: "100%",
      padding: "12px 14px",
      borderRadius: "var(--radius-control)",
      border: "var(--border-hairline) solid " + (error ? "var(--red-500)" : fc ? "var(--border-brand)" : "var(--border-default)"),
      background: "var(--bg-surface)",
      color: "var(--text-primary)",
      font: "var(--type-body)",
      outline: "none",
      resize: "vertical",
      boxShadow: fc ? "var(--focus-ring)" : "none",
      transition: "var(--transition-control)",
      ...style
    }
  }, rest));
}
Object.assign(__ds_scope, { Textarea });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Textarea.jsx", error: String((e && e.message) || e) }); }

// components/navigation/TabBar.jsx
try { (() => {
function TabBar({
  items = [],
  value,
  onChange,
  style
}) {
  return /*#__PURE__*/React.createElement("nav", {
    style: {
      height: "var(--app-tabbar-h)",
      display: "grid",
      gridAutoFlow: "column",
      gridAutoColumns: "1fr",
      alignItems: "center",
      background: "var(--surface-glass)",
      backdropFilter: "var(--blur-glass)",
      WebkitBackdropFilter: "var(--blur-glass)",
      borderTop: "var(--border-hairline) solid var(--border-subtle)",
      ...style
    }
  }, items.map(it => {
    const on = it.value === value;
    return /*#__PURE__*/React.createElement("button", {
      key: it.value,
      onClick: () => onChange && onChange(it.value),
      style: {
        border: "none",
        background: "transparent",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        padding: "6px 0",
        color: on ? "var(--accent)" : "var(--text-tertiary)",
        transition: "var(--transition-control)"
      }
    }, it.icon, /*#__PURE__*/React.createElement("span", {
      style: {
        font: "var(--type-caption)",
        fontWeight: on ? "var(--fw-medium)" : "var(--fw-regular)"
      }
    }, it.label));
  }));
}
Object.assign(__ds_scope, { TabBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/TabBar.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
function Tabs({
  items = [],
  value,
  onChange,
  variant = "underline",
  style
}) {
  const seg = variant === "segmented";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-flex",
      gap: seg ? 4 : "var(--space-8)",
      padding: seg ? 4 : 0,
      background: seg ? "var(--bg-inset)" : "transparent",
      borderRadius: seg ? "var(--radius-pill)" : 0,
      borderBottom: seg ? "none" : "var(--border-hairline) solid var(--border-subtle)",
      ...style
    }
  }, items.map(it => {
    const k = it.value || it,
      l = it.label || it,
      on = k === value;
    return /*#__PURE__*/React.createElement("button", {
      key: k,
      onClick: () => onChange && onChange(k),
      style: {
        border: "none",
        cursor: "pointer",
        font: "var(--type-label)",
        transition: "var(--transition-control)",
        padding: seg ? "7px 16px" : "0 0 12px",
        borderRadius: seg ? "var(--radius-pill)" : 0,
        background: seg ? on ? "var(--bg-surface)" : "transparent" : "transparent",
        boxShadow: seg && on ? "var(--shadow-sm)" : "none",
        color: on ? "var(--text-primary)" : "var(--text-tertiary)",
        borderBottom: seg ? "none" : "2px solid " + (on ? "var(--accent)" : "transparent"),
        marginBottom: seg ? 0 : -1
      }
    }, l, it.count != null && /*#__PURE__*/React.createElement("span", {
      style: {
        marginLeft: 6,
        color: "var(--text-tertiary)"
      }
    }, it.count));
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// components/navigation/TopBar.jsx
try { (() => {
function TopBar({
  title,
  left,
  right,
  transparent,
  style,
  children
}) {
  return /*#__PURE__*/React.createElement("header", {
    style: {
      height: "var(--app-topbar-h)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "var(--space-5)",
      padding: "0 var(--space-6)",
      position: "sticky",
      top: 0,
      zIndex: 20,
      background: transparent ? "transparent" : "var(--surface-glass)",
      backdropFilter: transparent ? "none" : "var(--blur-glass)",
      WebkitBackdropFilter: transparent ? "none" : "var(--blur-glass)",
      borderBottom: "var(--border-hairline) solid " + (transparent ? "transparent" : "var(--border-subtle)"),
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-4)",
      minWidth: 0
    }
  }, left, title && /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-h4)",
      letterSpacing: "var(--ls-tight)",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis"
    }
  }, title)), children, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-3)"
    }
  }, right));
}
Object.assign(__ds_scope, { TopBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/TopBar.jsx", error: String((e && e.message) || e) }); }

// components/places/CollectionTile.jsx
try { (() => {
function CollectionTile({
  name,
  count,
  tone = "sky",
  cover,
  onClick,
  style
}) {
  const [h, setH] = React.useState(false);
  const washes = {
    sky: "var(--gradient-sky)",
    brand: "var(--gradient-brand)",
    night: "var(--gradient-night)",
    soft: "var(--gradient-brand-soft)"
  };
  const dark = tone !== "soft";
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: {
      position: "relative",
      border: "none",
      padding: 0,
      textAlign: "left",
      cursor: "pointer",
      borderRadius: "var(--radius-card)",
      overflow: "hidden",
      height: 140,
      background: washes[tone],
      boxShadow: h ? "var(--shadow-lg)" : "var(--shadow-sm)",
      transform: h ? "translateY(-2px)" : "none",
      transition: "var(--transition-surface)",
      ...style
    }
  }, cover && /*#__PURE__*/React.createElement("img", {
    src: cover,
    alt: "",
    style: {
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      objectFit: "cover"
    }
  }), cover && /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      inset: 0,
      background: "var(--scrim-bottom)"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      left: "var(--space-6)",
      bottom: "var(--space-6)",
      right: "var(--space-6)",
      display: "flex",
      flexDirection: "column",
      gap: 2,
      color: dark || cover ? "#fff" : "var(--indigo-900)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-h4)",
      letterSpacing: "var(--ls-tight)"
    }
  }, name), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-caption)",
      opacity: .85
    }
  }, count, " ", count === 1 ? "place" : "places")));
}
Object.assign(__ds_scope, { CollectionTile });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/places/CollectionTile.jsx", error: String((e && e.message) || e) }); }

// components/places/MapSurface.jsx
try { (() => {
/* Calm map backdrop. Loads OpenStreetMap raster tiles and desaturates them to sit
   under FIBI's pins; falls back to a soft neutral wash if tiles are unavailable. */
function tileXY(lat, lon, z) {
  const n = 2 ** z;
  return {
    x: Math.floor((lon + 180) / 360 * n),
    y: Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n)
  };
}
function MapSurface({
  center = [38.7223, -9.1393],
  zoom = 13,
  cols = 5,
  rows = 4,
  children,
  style
}) {
  const {
    x,
    y
  } = tileXY(center[0], center[1], zoom);
  const tiles = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) tiles.push([x + i - Math.floor(cols / 2), y + j - Math.floor(rows / 2)]);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      overflow: "hidden",
      background: "var(--bg-inset)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      display: "grid",
      gridTemplateColumns: `repeat(${cols},256px)`,
      gridAutoRows: "256px",
      placeContent: "center",
      filter: "saturate(.45) brightness(1.06) contrast(.92)",
      opacity: .9
    }
  }, tiles.map(([tx, ty]) => /*#__PURE__*/React.createElement("img", {
    key: tx + "/" + ty,
    src: `https://tile.openstreetmap.org/${zoom}/${tx}/${ty}.png`,
    alt: "",
    width: 256,
    height: 256,
    style: {
      display: "block"
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      background: "radial-gradient(120% 90% at 50% 40%,transparent 40%,rgba(16,16,40,.06) 100%)",
      pointerEvents: "none"
    }
  }), children);
}
Object.assign(__ds_scope, { MapSurface });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/places/MapSurface.jsx", error: String((e && e.message) || e) }); }

// components/places/PinMarker.jsx
try { (() => {
const fills = {
  default: "var(--pin-default)",
  saved: "var(--pin-saved)",
  visited: "var(--pin-visited)",
  muted: "var(--neutral-400)"
};
function PinMarker({
  tone = "default",
  size = 32,
  label,
  active,
  style
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 4,
      transform: active ? "scale(1.12)" : "none",
      transition: "transform var(--dur-base) var(--ease-out)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: size,
      height: size,
      borderRadius: "var(--radius-circle)",
      background: fills[tone],
      border: "2.5px solid #fff",
      boxShadow: "var(--shadow-pin)",
      display: "grid",
      placeItems: "center",
      color: "#fff"
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: size * 0.5,
    height: size * 0.5,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.2",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "10",
    r: "2.2"
  }))), label && /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-caption)",
      fontWeight: "var(--fw-medium)",
      color: "var(--text-primary)",
      background: "var(--surface-glass)",
      backdropFilter: "var(--blur-glass)",
      padding: "2px 8px",
      borderRadius: "var(--radius-pill)",
      whiteSpace: "nowrap",
      boxShadow: "var(--shadow-xs)"
    }
  }, label));
}
Object.assign(__ds_scope, { PinMarker });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/places/PinMarker.jsx", error: String((e && e.message) || e) }); }

// components/places/PlaceCard.jsx
try { (() => {
const sources = {
  tiktok: {
    label: "TikTok",
    color: "var(--orchid-400)"
  },
  instagram: {
    label: "Instagram",
    color: "var(--gold-500)"
  },
  youtube: {
    label: "YouTube",
    color: "var(--red-500)"
  },
  link: {
    label: "Link",
    color: "var(--sky-500)"
  }
};
function PlaceCard({
  name,
  location,
  note,
  image,
  source = "link",
  tags = [],
  saved,
  layout = "vertical",
  onClick,
  style
}) {
  const [h, setH] = React.useState(false);
  const row = layout === "row";
  const media = /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      flex: row ? "0 0 96px" : "none",
      height: row ? 96 : 168,
      borderRadius: row ? "var(--radius-md)" : "var(--radius-lg) var(--radius-lg) 0 0",
      overflow: "hidden",
      background: image ? "var(--bg-inset)" : "var(--gradient-brand-soft)",
      display: "grid",
      placeItems: "center"
    }
  }, image ? /*#__PURE__*/React.createElement("img", {
    src: image,
    alt: "",
    style: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      display: "block",
      transform: h ? "scale(1.03)" : "none",
      transition: "transform var(--dur-slow) var(--ease-out)"
    }
  }) : /*#__PURE__*/React.createElement("svg", {
    width: "24",
    height: "24",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "var(--sky-500)",
    strokeWidth: "1.5",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "10",
    r: "2.5"
  })), source && /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: 8,
      left: 8,
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      height: 22,
      padding: "0 9px",
      borderRadius: "var(--radius-pill)",
      background: "var(--surface-glass)",
      backdropFilter: "var(--blur-glass)",
      font: "var(--type-caption)",
      fontWeight: "var(--fw-medium)",
      color: "var(--text-primary)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: "50%",
      background: (sources[source] || sources.link).color
    }
  }), (sources[source] || sources.link).label));
  return /*#__PURE__*/React.createElement("article", {
    onClick: onClick,
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: {
      display: "flex",
      flexDirection: row ? "row" : "column",
      gap: row ? "var(--space-5)" : 0,
      padding: row ? "var(--space-5)" : 0,
      alignItems: row ? "center" : "stretch",
      background: "var(--surface-card)",
      border: "var(--border-hairline) solid var(--border-subtle)",
      borderRadius: "var(--radius-card)",
      overflow: "hidden",
      cursor: onClick ? "pointer" : "default",
      boxShadow: h ? "var(--shadow-lg)" : "var(--shadow-sm)",
      transform: h ? "translateY(-2px)" : "none",
      transition: "var(--transition-surface)",
      ...style
    }
  }, media, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: row ? 0 : "var(--space-6)",
      minWidth: 0,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: "var(--space-4)"
    }
  }, /*#__PURE__*/React.createElement("h4", {
    style: {
      font: "var(--type-h4)",
      letterSpacing: "var(--ls-tight)",
      margin: 0,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, name), saved && /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "var(--gold-500)",
    stroke: "none"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z"
  }))), location && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 5,
      marginTop: 4,
      font: "var(--type-caption)",
      color: "var(--text-tertiary)"
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "12",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z"
  })), location), note && /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--type-sm)",
      fontSize: "var(--fs-sm)",
      lineHeight: "var(--lh-sm)",
      color: "var(--text-secondary)",
      margin: "var(--space-4) 0 0",
      textWrap: "pretty"
    }
  }, note), tags.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 6,
      marginTop: "var(--space-5)"
    }
  }, tags.map(t => /*#__PURE__*/React.createElement("span", {
    key: t,
    style: {
      height: 24,
      display: "inline-flex",
      alignItems: "center",
      padding: "0 10px",
      borderRadius: "var(--radius-pill)",
      background: "var(--bg-inset)",
      font: "var(--type-caption)",
      color: "var(--text-secondary)"
    }
  }, t)))));
}
Object.assign(__ds_scope, { PlaceCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/places/PlaceCard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/Screens.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  TopBar,
  TabBar,
  Tabs,
  SearchField,
  PlaceCard,
  CollectionTile,
  PinMarker,
  MapSurface,
  Button,
  IconButton,
  Icon,
  Logo,
  Tag,
  Badge,
  Card,
  EmptyState,
  Dialog,
  Toast,
  Field,
  Input,
  Textarea,
  Select,
  Switch
} = window.FIBIDesignSystem_383abe;
const SEED = [{
  id: 1,
  name: "Time Out Market",
  location: "Lisbon, Portugal",
  source: "tiktok",
  note: "Go early — the seafood counter gets busy.",
  tags: ["Food", "Lisbon"],
  saved: true,
  x: "24%",
  y: "32%",
  tone: "saved"
}, {
  id: 2,
  name: "Praia da Ursa",
  location: "Sintra",
  source: "instagram",
  note: "Steep path down. Worth it at sunset.",
  tags: ["Beach"],
  x: "58%",
  y: "56%",
  tone: "default"
}, {
  id: 3,
  name: "Fábrica Coffee Roasters",
  location: "Chiado",
  source: "link",
  note: "",
  tags: ["Coffee"],
  x: "40%",
  y: "72%",
  tone: "visited"
}, {
  id: 4,
  name: "Miradouro da Senhora do Monte",
  location: "Graça",
  source: "youtube",
  note: "Best view over the city, free.",
  tags: ["View"],
  x: "72%",
  y: "24%",
  tone: "default"
}];
const Screen = ({
  children,
  style
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    background: "var(--bg-page)",
    ...style
  }
}, children);
const Body = ({
  children,
  style
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    flex: 1,
    overflow: "auto",
    padding: "var(--space-6) var(--space-6) var(--space-10)",
    ...style
  }
}, children);
const StatusSpacer = () => /*#__PURE__*/React.createElement("div", {
  style: {
    height: 54,
    flex: "0 0 auto"
  }
});
const SectionLabel = ({
  children,
  right
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    margin: "var(--space-8) 0 var(--space-5)"
  }
}, /*#__PURE__*/React.createElement("span", {
  style: {
    font: "var(--type-caption)",
    fontWeight: "var(--fw-medium)",
    letterSpacing: "var(--ls-caps)",
    textTransform: "uppercase",
    color: "var(--text-tertiary)"
  }
}, children), right);
function PlacesScreen({
  places,
  query,
  setQuery,
  onOpen,
  onAdd
}) {
  const list = places.filter(p => (p.name + p.location).toLowerCase().includes(query.toLowerCase()));
  return /*#__PURE__*/React.createElement(Screen, null, /*#__PURE__*/React.createElement(StatusSpacer, null), /*#__PURE__*/React.createElement(TopBar, {
    left: /*#__PURE__*/React.createElement(Logo, {
      variant: "mark",
      height: 26
    }),
    title: "Your places",
    right: /*#__PURE__*/React.createElement(IconButton, {
      icon: /*#__PURE__*/React.createElement(Icon, {
        name: "sliders-horizontal",
        size: 19
      }),
      label: "Filter"
    })
  }), /*#__PURE__*/React.createElement(Body, null, /*#__PURE__*/React.createElement(SearchField, {
    value: query,
    onChange: setQuery,
    onClear: () => setQuery(""),
    placeholder: "Search places"
  }), /*#__PURE__*/React.createElement(SectionLabel, {
    right: /*#__PURE__*/React.createElement("a", {
      href: "#",
      style: {
        font: "var(--type-caption)"
      }
    }, "See all")
  }, "Collections"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "var(--space-5)"
    }
  }, /*#__PURE__*/React.createElement(CollectionTile, {
    name: "Lisbon",
    count: 12,
    tone: "sky",
    style: {
      height: 104
    }
  }), /*#__PURE__*/React.createElement(CollectionTile, {
    name: "Weekend trips",
    count: 5,
    tone: "brand",
    style: {
      height: 104
    }
  }), /*#__PURE__*/React.createElement(CollectionTile, {
    name: "Coffee",
    count: 9,
    tone: "night",
    style: {
      height: 104
    }
  }), /*#__PURE__*/React.createElement(CollectionTile, {
    name: "Someday",
    count: 23,
    tone: "soft",
    style: {
      height: 104
    }
  })), /*#__PURE__*/React.createElement(SectionLabel, {
    right: /*#__PURE__*/React.createElement("span", {
      style: {
        font: "var(--type-caption)",
        color: "var(--text-tertiary)"
      }
    }, list.length)
  }, "Recently saved"), list.length === 0 ? /*#__PURE__*/React.createElement(EmptyState, {
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "map-pin",
      size: 26
    }),
    title: "Nothing here yet",
    description: "Share a link from TikTok or Instagram and it lands here.",
    action: /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      size: "sm",
      onClick: onAdd
    }, "Add a place")
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gap: "var(--space-5)"
    }
  }, list.map(p => /*#__PURE__*/React.createElement(PlaceCard, _extends({
    key: p.id,
    layout: "row"
  }, p, {
    onClick: () => onOpen(p)
  }))))));
}
function MapScreen({
  places,
  onOpen
}) {
  const [active, setActive] = React.useState(places[0]);
  return /*#__PURE__*/React.createElement(Screen, null, /*#__PURE__*/React.createElement(MapSurface, {
    center: [38.7223, -9.1393],
    zoom: 13,
    cols: 4,
    rows: 5,
    style: {
      position: "absolute",
      inset: 0
    }
  }, places.map(p => /*#__PURE__*/React.createElement("span", {
    key: p.id,
    onClick: () => setActive(p),
    style: {
      position: "absolute",
      left: p.x,
      top: p.y,
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement(PinMarker, {
    tone: p.tone,
    active: active && active.id === p.id,
    label: active && active.id === p.id ? p.name : undefined
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      display: "flex",
      flexDirection: "column",
      height: "100%",
      pointerEvents: "none"
    }
  }, /*#__PURE__*/React.createElement(StatusSpacer, null), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 var(--space-6)",
      display: "flex",
      gap: "var(--space-4)",
      pointerEvents: "auto"
    }
  }, /*#__PURE__*/React.createElement(SearchField, {
    placeholder: "Search this area",
    style: {
      flex: 1,
      boxShadow: "var(--shadow-md)",
      borderRadius: "var(--radius-pill)"
    }
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "layers",
      size: 19
    }),
    label: "Layers",
    variant: "glass"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), active && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 var(--space-6) var(--space-10)",
      pointerEvents: "auto"
    }
  }, /*#__PURE__*/React.createElement(PlaceCard, _extends({
    layout: "row"
  }, active, {
    onClick: () => onOpen(active),
    style: {
      boxShadow: "var(--shadow-lg)"
    }
  })))));
}
function DetailScreen({
  place,
  onBack
}) {
  return /*#__PURE__*/React.createElement(Screen, null, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      height: 280,
      flex: "0 0 auto",
      background: "var(--gradient-brand-soft)",
      display: "grid",
      placeItems: "center"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "map-pin",
    size: 40,
    color: "var(--sky-500)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      inset: 0,
      background: "var(--scrim-top)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: 54,
      left: "var(--space-6)",
      right: "var(--space-6)",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "chevron-left",
      size: 20
    }),
    label: "Back",
    variant: "glass",
    onClick: onBack
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "var(--space-3)"
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "share",
      size: 19
    }),
    label: "Share",
    variant: "glass"
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "bookmark",
      size: 19
    }),
    label: "Save",
    variant: "glass"
  })))), /*#__PURE__*/React.createElement(Body, {
    style: {
      marginTop: -28,
      borderRadius: "var(--radius-sheet) var(--radius-sheet) 0 0",
      background: "var(--bg-page)",
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      font: "var(--type-h2)",
      letterSpacing: "var(--ls-tight)",
      margin: "0 0 var(--space-3)"
    }
  }, place.name), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      font: "var(--type-label)",
      color: "var(--text-secondary)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "map-pin",
    size: 14
  }), place.location, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--border-default)"
    }
  }, "\xB7"), /*#__PURE__*/React.createElement(Badge, {
    tone: "info"
  }, "From ", place.source)), place.note && /*#__PURE__*/React.createElement(Card, {
    tone: "subtle",
    padding: "var(--space-6)",
    style: {
      marginTop: "var(--space-7)"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--type-caption)",
      letterSpacing: "var(--ls-caps)",
      textTransform: "uppercase",
      color: "var(--text-tertiary)",
      margin: "0 0 6px"
    }
  }, "Your note"), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--type-body)",
      margin: 0,
      textWrap: "pretty"
    }
  }, place.note)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap",
      marginTop: "var(--space-7)"
    }
  }, (place.tags || []).map(t => /*#__PURE__*/React.createElement(Tag, {
    key: t
  }, t)), /*#__PURE__*/React.createElement(Tag, {
    interactive: true
  }, "+ Add tag")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gap: "var(--space-4)",
      marginTop: "var(--space-9)"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    fullWidth: true,
    iconLeft: /*#__PURE__*/React.createElement(Icon, {
      name: "navigation",
      size: 16
    })
  }, "Open in Maps"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    fullWidth: true,
    iconLeft: /*#__PURE__*/React.createElement(Icon, {
      name: "folder-plus",
      size: 16
    })
  }, "Move to collection"))));
}
function YouScreen() {
  const [a, setA] = React.useState(true),
    [b, setB] = React.useState(false),
    [c, setC] = React.useState(true);
  return /*#__PURE__*/React.createElement(Screen, null, /*#__PURE__*/React.createElement(StatusSpacer, null), /*#__PURE__*/React.createElement(TopBar, {
    title: "You"
  }), /*#__PURE__*/React.createElement(Body, null, /*#__PURE__*/React.createElement(Card, {
    padding: "var(--space-6)",
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-6)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 52,
      height: 52,
      borderRadius: "50%",
      background: "var(--gradient-sky)",
      display: "grid",
      placeItems: "center",
      color: "#fff",
      font: "var(--fw-semibold) 18px/1 var(--font-sans)"
    }
  }, "AM"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--type-h4)"
    }
  }, "Alex Moreira"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--type-caption)",
      color: "var(--text-tertiary)"
    }
  }, "alex@example.com"))), /*#__PURE__*/React.createElement(SectionLabel, null, "Preferences"), /*#__PURE__*/React.createElement(Card, {
    padding: "var(--space-6)",
    style: {
      display: "grid",
      gap: "var(--space-7)"
    }
  }, /*#__PURE__*/React.createElement(Switch, {
    checked: a,
    onChange: setA,
    label: "Show visited places"
  }), /*#__PURE__*/React.createElement(Switch, {
    checked: b,
    onChange: setB,
    label: "Dark map style"
  }), /*#__PURE__*/React.createElement(Switch, {
    checked: c,
    onChange: setC,
    label: "Pull preview images automatically"
  }), /*#__PURE__*/React.createElement(Field, {
    label: "Default collection"
  }, /*#__PURE__*/React.createElement(Select, {
    options: ["Someday", "Lisbon", "Coffee"]
  }))), /*#__PURE__*/React.createElement(SectionLabel, null, "App"), /*#__PURE__*/React.createElement(Card, {
    padding: "0",
    style: {
      overflow: "hidden"
    }
  }, [["smartphone", "Install Fibi on this phone"], ["share", "How to share from TikTok"], ["shield", "Privacy"], ["file-text", "Terms"]].map(([i, t], n) => /*#__PURE__*/React.createElement("div", {
    key: t,
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-5)",
      padding: "var(--space-6)",
      borderTop: n ? "1px solid var(--border-subtle)" : "none",
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: i,
    size: 18,
    color: "var(--text-tertiary)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      font: "var(--type-body)"
    }
  }, t), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-right",
    size: 16,
    color: "var(--text-tertiary)"
  })))), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    fullWidth: true,
    style: {
      marginTop: "var(--space-8)",
      color: "var(--red-500)"
    }
  }, "Sign out")));
}
function AddSheet({
  open,
  onClose,
  onSave
}) {
  const [step, setStep] = React.useState(0);
  const [name, setName] = React.useState("");
  React.useEffect(() => {
    if (open) {
      setStep(0);
      setName("");
    }
  }, [open]);
  const link = "https://www.tiktok.com/@lisbonfoodie/video/7391…";
  return /*#__PURE__*/React.createElement(Dialog, {
    open: open,
    onClose: onClose,
    variant: "sheet",
    title: step === 0 ? "Add a place" : "Make it yours",
    description: step === 0 ? "Paste a link, or share straight to Fibi from any app." : "Add what you'll need to remember why you saved it.",
    footer: step === 0 ? /*#__PURE__*/React.createElement(Button, {
      fullWidth: true,
      onClick: () => setStep(1)
    }, "Pull in preview") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      onClick: onClose
    }, "Cancel"), /*#__PURE__*/React.createElement(Button, {
      onClick: () => onSave({
        name: name || "Cervejaria Ramiro",
        location: "Intendente, Lisbon",
        source: "tiktok",
        note: "",
        tags: ["Food"],
        x: "50%",
        y: "44%",
        tone: "default"
      })
    }, "Save place"))
  }, step === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gap: "var(--space-6)"
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Link"
  }, /*#__PURE__*/React.createElement(Input, {
    defaultValue: link,
    iconLeft: /*#__PURE__*/React.createElement(Icon, {
      name: "link",
      size: 16
    })
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement(Tag, {
    interactive: true,
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "clipboard",
      size: 14
    })
  }, "Paste"), /*#__PURE__*/React.createElement(Tag, {
    interactive: true,
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "image",
      size: 14
    })
  }, "Add screenshot"))) : /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gap: "var(--space-6)"
    }
  }, /*#__PURE__*/React.createElement(Card, {
    tone: "subtle",
    padding: "var(--space-5)",
    style: {
      display: "flex",
      gap: "var(--space-5)",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 56,
      height: 56,
      borderRadius: "var(--radius-md)",
      background: "var(--gradient-brand-soft)",
      display: "grid",
      placeItems: "center"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "video",
    size: 18,
    color: "var(--orchid-500)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--type-label)",
      color: "var(--text-primary)"
    }
  }, "Pulled from TikTok"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--type-caption)",
      color: "var(--text-tertiary)",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, link))), /*#__PURE__*/React.createElement(Field, {
    label: "Name"
  }, /*#__PURE__*/React.createElement(Input, {
    value: name,
    onChange: e => setName(e.target.value),
    placeholder: "Cervejaria Ramiro"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Location"
  }, /*#__PURE__*/React.createElement(Input, {
    defaultValue: "Intendente, Lisbon",
    iconLeft: /*#__PURE__*/React.createElement(Icon, {
      name: "map-pin",
      size: 16
    })
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Note",
    hint: "Why did you save it?"
  }, /*#__PURE__*/React.createElement(Textarea, {
    rows: 2,
    placeholder: "Garlic prawns, then the steak sandwich."
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Collection"
  }, /*#__PURE__*/React.createElement(Select, {
    options: ["Lisbon", "Someday", "Coffee"]
  }))));
}
function FibiApp() {
  const [tab, setTab] = React.useState("places");
  const [places, setPlaces] = React.useState(SEED);
  const [query, setQuery] = React.useState("");
  const [detail, setDetail] = React.useState(null);
  const [add, setAdd] = React.useState(false);
  const [toast, setToast] = React.useState(null);
  const save = p => {
    setPlaces([{
      ...p,
      id: Date.now()
    }, ...places]);
    setAdd(false);
    setTab("places");
    setToast("Saved to Lisbon");
    setTimeout(() => setToast(null), 2600);
  };
  const tabs = [{
    value: "places",
    label: "Places",
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "layout-grid",
      size: 20
    })
  }, {
    value: "map",
    label: "Map",
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "map",
      size: 20
    })
  }, {
    value: "add",
    label: "Add",
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "plus-circle",
      size: 20
    })
  }, {
    value: "you",
    label: "You",
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "user",
      size: 20
    })
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      height: "100%",
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      position: "relative"
    }
  }, detail ? /*#__PURE__*/React.createElement(DetailScreen, {
    place: detail,
    onBack: () => setDetail(null)
  }) : tab === "map" ? /*#__PURE__*/React.createElement(MapScreen, {
    places: places,
    onOpen: setDetail
  }) : tab === "you" ? /*#__PURE__*/React.createElement(YouScreen, null) : /*#__PURE__*/React.createElement(PlacesScreen, {
    places: places,
    query: query,
    setQuery: setQuery,
    onOpen: setDetail,
    onAdd: () => setAdd(true)
  })), !detail && /*#__PURE__*/React.createElement(TabBar, {
    value: tab,
    onChange: v => v === "add" ? setAdd(true) : setTab(v),
    items: tabs,
    style: {
      paddingBottom: 20,
      height: 84,
      flex: "0 0 auto"
    }
  }), /*#__PURE__*/React.createElement(AddSheet, {
    open: add,
    onClose: () => setAdd(false),
    onSave: save
  }), toast && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 110,
      display: "flex",
      justifyContent: "center",
      zIndex: 70
    }
  }, /*#__PURE__*/React.createElement(Toast, {
    tone: "success",
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 16
    })
  }, toast)));
}
Object.assign(window, {
  FibiApp,
  PlacesScreen,
  MapScreen,
  DetailScreen,
  YouScreen,
  AddSheet,
  SEED
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/Screens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/ios-frame.jsx
try { (() => {
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)
// Copied omelette starter. Re-running copy_starter_component with this kind overwrites this file with the latest version (page content is unaffected).

/* BEGIN USAGE */
// iOS.jsx — Simplified iOS 26 (Liquid Glass) device frame
// Based on the iOS 26 UI Kit + Figma status bar spec. No assets, no deps.
// Exports (to window): IOSDevice, IOSStatusBar, IOSNavBar, IOSGlassPill, IOSList, IOSListRow, IOSKeyboard
//
// Usage — wrap your screen content in <IOSDevice> to get the bezel, status bar
// and home indicator (props: title, dark, keyboard):
//
//   <IOSDevice title="Settings">
//     ...your screen content...
//   </IOSDevice>
//   <IOSDevice dark title="Search" keyboard>…</IOSDevice>
/* END USAGE */

// ─────────────────────────────────────────────────────────────
// Status bar
// ─────────────────────────────────────────────────────────────
function IOSStatusBar({
  dark = false,
  time = '9:41'
}) {
  const c = dark ? '#fff' : '#000';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 154,
      alignItems: 'center',
      justifyContent: 'center',
      padding: '21px 24px 19px',
      boxSizing: 'border-box',
      position: 'relative',
      zIndex: 20,
      width: '100%'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 22,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 1.5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: '-apple-system, "SF Pro", system-ui',
      fontWeight: 590,
      fontSize: 17,
      lineHeight: '22px',
      color: c
    }
  }, time)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 22,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingTop: 1,
      paddingRight: 1
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "19",
    height: "12",
    viewBox: "0 0 19 12"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "7.5",
    width: "3.2",
    height: "4.5",
    rx: "0.7",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "4.8",
    y: "5",
    width: "3.2",
    height: "7",
    rx: "0.7",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "9.6",
    y: "2.5",
    width: "3.2",
    height: "9.5",
    rx: "0.7",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14.4",
    y: "0",
    width: "3.2",
    height: "12",
    rx: "0.7",
    fill: c
  })), /*#__PURE__*/React.createElement("svg", {
    width: "17",
    height: "12",
    viewBox: "0 0 17 12"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M8.5 3.2C10.8 3.2 12.9 4.1 14.4 5.6L15.5 4.5C13.7 2.7 11.2 1.5 8.5 1.5C5.8 1.5 3.3 2.7 1.5 4.5L2.6 5.6C4.1 4.1 6.2 3.2 8.5 3.2Z",
    fill: c
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8.5 6.8C9.9 6.8 11.1 7.3 12 8.2L13.1 7.1C11.8 5.9 10.2 5.1 8.5 5.1C6.8 5.1 5.2 5.9 3.9 7.1L5 8.2C5.9 7.3 7.1 6.8 8.5 6.8Z",
    fill: c
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "8.5",
    cy: "10.5",
    r: "1.5",
    fill: c
  })), /*#__PURE__*/React.createElement("svg", {
    width: "27",
    height: "13",
    viewBox: "0 0 27 13"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0.5",
    y: "0.5",
    width: "23",
    height: "12",
    rx: "3.5",
    stroke: c,
    strokeOpacity: "0.35",
    fill: "none"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "2",
    width: "20",
    height: "9",
    rx: "2",
    fill: c
  }), /*#__PURE__*/React.createElement("path", {
    d: "M25 4.5V8.5C25.8 8.2 26.5 7.2 26.5 6.5C26.5 5.8 25.8 4.8 25 4.5Z",
    fill: c,
    fillOpacity: "0.4"
  }))));
}

// ─────────────────────────────────────────────────────────────
// Liquid glass pill — blur + tint + shine
// ─────────────────────────────────────────────────────────────
function IOSGlassPill({
  children,
  dark = false,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: 44,
      minWidth: 44,
      borderRadius: 9999,
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: dark ? '0 2px 6px rgba(0,0,0,0.35), 0 6px 16px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.07), 0 3px 10px rgba(0,0,0,0.06)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 9999,
      backdropFilter: 'blur(12px) saturate(180%)',
      WebkitBackdropFilter: 'blur(12px) saturate(180%)',
      background: dark ? 'rgba(120,120,128,0.28)' : 'rgba(255,255,255,0.5)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 9999,
      boxShadow: dark ? 'inset 1.5px 1.5px 1px rgba(255,255,255,0.15), inset -1px -1px 1px rgba(255,255,255,0.08)' : 'inset 1.5px 1.5px 1px rgba(255,255,255,0.7), inset -1px -1px 1px rgba(255,255,255,0.4)',
      border: dark ? '0.5px solid rgba(255,255,255,0.15)' : '0.5px solid rgba(0,0,0,0.06)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      zIndex: 1,
      display: 'flex',
      alignItems: 'center',
      padding: '0 4px'
    }
  }, children));
}

// ─────────────────────────────────────────────────────────────
// Navigation bar — glass pills + large title
// ─────────────────────────────────────────────────────────────
function IOSNavBar({
  title = 'Title',
  dark = false,
  trailingIcon = true
}) {
  const muted = dark ? 'rgba(255,255,255,0.6)' : '#404040';
  const text = dark ? '#fff' : '#000';
  const pillIcon = content => /*#__PURE__*/React.createElement(IOSGlassPill, {
    dark: dark
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, content));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      paddingTop: 62,
      paddingBottom: 10,
      position: 'relative',
      zIndex: 5
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px'
    }
  }, pillIcon(/*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "20",
    viewBox: "0 0 12 20",
    fill: "none",
    style: {
      marginLeft: -1
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M10 2L2 10l8 8",
    stroke: muted,
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }))), trailingIcon && pillIcon(/*#__PURE__*/React.createElement("svg", {
    width: "22",
    height: "6",
    viewBox: "0 0 22 6"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "3",
    cy: "3",
    r: "2.5",
    fill: muted
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "3",
    r: "2.5",
    fill: muted
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "19",
    cy: "3",
    r: "2.5",
    fill: muted
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 16px',
      fontFamily: '-apple-system, system-ui',
      fontSize: 34,
      fontWeight: 700,
      lineHeight: '41px',
      color: text,
      letterSpacing: 0.4
    }
  }, title));
}

// ─────────────────────────────────────────────────────────────
// Grouped list (inset card, r:26) + row (52px)
// ─────────────────────────────────────────────────────────────
function IOSListRow({
  title,
  detail,
  icon,
  chevron = true,
  isLast = false,
  dark = false
}) {
  const text = dark ? '#fff' : '#000';
  const sec = dark ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.6)';
  const ter = dark ? 'rgba(235,235,245,0.3)' : 'rgba(60,60,67,0.3)';
  const sep = dark ? 'rgba(84,84,88,0.65)' : 'rgba(60,60,67,0.12)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      minHeight: 52,
      padding: '0 16px',
      position: 'relative',
      fontFamily: '-apple-system, system-ui',
      fontSize: 17,
      letterSpacing: -0.43
    }
  }, icon && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 30,
      height: 30,
      borderRadius: 7,
      background: icon,
      marginRight: 12,
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      color: text
    }
  }, title), detail && /*#__PURE__*/React.createElement("span", {
    style: {
      color: sec,
      marginRight: 6
    }
  }, detail), chevron && /*#__PURE__*/React.createElement("svg", {
    width: "8",
    height: "14",
    viewBox: "0 0 8 14",
    style: {
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M1 1l6 6-6 6",
    stroke: ter,
    strokeWidth: "2",
    fill: "none",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  })), !isLast && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      left: icon ? 58 : 16,
      height: 0.5,
      background: sep
    }
  }));
}
function IOSList({
  header,
  children,
  dark = false
}) {
  const hc = dark ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.6)';
  const bg = dark ? '#1C1C1E' : '#fff';
  return /*#__PURE__*/React.createElement("div", null, header && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: '-apple-system, system-ui',
      fontSize: 13,
      color: hc,
      textTransform: 'uppercase',
      padding: '8px 36px 6px',
      letterSpacing: -0.08
    }
  }, header), /*#__PURE__*/React.createElement("div", {
    style: {
      background: bg,
      borderRadius: 26,
      margin: '0 16px',
      overflow: 'hidden'
    }
  }, children));
}

// ─────────────────────────────────────────────────────────────
// Device frame
// ─────────────────────────────────────────────────────────────
function IOSDevice({
  children,
  width = 402,
  height = 874,
  dark = false,
  title,
  keyboard = false
}) {
  return (
    /*#__PURE__*/
    // data-om-starter: inert presence marker — Claude Design's starter-usage
    // probe reads it; it renders nothing. Keep it on this root element.
    React.createElement("div", {
      "data-om-starter": "ios-frame",
      style: {
        width,
        height,
        borderRadius: 48,
        overflow: 'hidden',
        position: 'relative',
        background: dark ? '#000' : '#F2F2F7',
        boxShadow: '0 40px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.12)',
        fontFamily: '-apple-system, system-ui, sans-serif',
        WebkitFontSmoothing: 'antialiased'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: 11,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 126,
        height: 37,
        borderRadius: 24,
        background: '#000',
        zIndex: 50
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10
      }
    }, /*#__PURE__*/React.createElement(IOSStatusBar, {
      dark: dark
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }
    }, title !== undefined && /*#__PURE__*/React.createElement(IOSNavBar, {
      title: title,
      dark: dark
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflow: 'auto'
      }
    }, children), keyboard && /*#__PURE__*/React.createElement(IOSKeyboard, {
      dark: dark
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 60,
        height: 34,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingBottom: 8,
        pointerEvents: 'none'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 139,
        height: 5,
        borderRadius: 100,
        background: dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.25)'
      }
    })))
  );
}

// ─────────────────────────────────────────────────────────────
// Keyboard — iOS 26 liquid glass
// ─────────────────────────────────────────────────────────────
function IOSKeyboard({
  dark = false
}) {
  const glyph = dark ? 'rgba(255,255,255,0.7)' : '#595959';
  const sugg = dark ? 'rgba(255,255,255,0.6)' : '#333';
  const keyBg = dark ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.85)';

  // special-key icons
  const icons = {
    shift: /*#__PURE__*/React.createElement("svg", {
      width: "19",
      height: "17",
      viewBox: "0 0 19 17"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M9.5 1L1 9.5h4.5V16h8V9.5H18L9.5 1z",
      fill: glyph
    })),
    del: /*#__PURE__*/React.createElement("svg", {
      width: "23",
      height: "17",
      viewBox: "0 0 23 17"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M7 1h13a2 2 0 012 2v11a2 2 0 01-2 2H7l-6-7.5L7 1z",
      fill: "none",
      stroke: glyph,
      strokeWidth: "1.6",
      strokeLinejoin: "round"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M10 5l7 7M17 5l-7 7",
      stroke: glyph,
      strokeWidth: "1.6",
      strokeLinecap: "round"
    })),
    ret: /*#__PURE__*/React.createElement("svg", {
      width: "20",
      height: "14",
      viewBox: "0 0 20 14"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M18 1v6H4m0 0l4-4M4 7l4 4",
      fill: "none",
      stroke: "#fff",
      strokeWidth: "1.8",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }))
  };
  const key = (content, {
    w,
    flex,
    ret,
    fs = 25,
    k
  } = {}) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      height: 42,
      borderRadius: 8.5,
      flex: flex ? 1 : undefined,
      width: w,
      minWidth: 0,
      background: ret ? '#08f' : keyBg,
      boxShadow: '0 1px 0 rgba(0,0,0,0.075)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, "SF Compact", system-ui',
      fontSize: fs,
      fontWeight: 458,
      color: ret ? '#fff' : glyph
    }
  }, content);
  const row = (keys, pad = 0) => /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6.5,
      justifyContent: 'center',
      padding: `0 ${pad}px`
    }
  }, keys.map(l => key(l, {
    flex: true,
    k: l
  })));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      zIndex: 15,
      borderRadius: 27,
      overflow: 'hidden',
      padding: '11px 0 2px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      boxShadow: dark ? '0 -2px 20px rgba(0,0,0,0.09)' : '0 -1px 6px rgba(0,0,0,0.018), 0 -3px 20px rgba(0,0,0,0.012)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 27,
      backdropFilter: 'blur(12px) saturate(180%)',
      WebkitBackdropFilter: 'blur(12px) saturate(180%)',
      background: dark ? 'rgba(120,120,128,0.14)' : 'rgba(255,255,255,0.25)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 27,
      boxShadow: dark ? 'inset 1.5px 1.5px 1px rgba(255,255,255,0.15)' : 'inset 1.5px 1.5px 1px rgba(255,255,255,0.7), inset -1px -1px 1px rgba(255,255,255,0.4)',
      border: dark ? '0.5px solid rgba(255,255,255,0.15)' : '0.5px solid rgba(0,0,0,0.06)',
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 20,
      alignItems: 'center',
      padding: '8px 22px 13px',
      width: '100%',
      boxSizing: 'border-box',
      position: 'relative'
    }
  }, ['"The"', 'the', 'to'].map((w, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, i > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 1,
      height: 25,
      background: '#ccc',
      opacity: 0.3
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      textAlign: 'center',
      fontFamily: '-apple-system, system-ui',
      fontSize: 17,
      color: sugg,
      letterSpacing: -0.43,
      lineHeight: '22px'
    }
  }, w)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 13,
      padding: '0 6.5px',
      width: '100%',
      boxSizing: 'border-box',
      position: 'relative'
    }
  }, row(['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p']), row(['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'], 20), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 14.25,
      alignItems: 'center'
    }
  }, key(icons.shift, {
    w: 45,
    k: 'shift'
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6.5,
      flex: 1
    }
  }, ['z', 'x', 'c', 'v', 'b', 'n', 'm'].map(l => key(l, {
    flex: true,
    k: l
  }))), key(icons.del, {
    w: 45,
    k: 'del'
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      alignItems: 'center'
    }
  }, key('ABC', {
    w: 92.25,
    fs: 18,
    k: 'abc'
  }), key('', {
    flex: true,
    k: 'space'
  }), key(icons.ret, {
    w: 92.25,
    ret: true,
    k: 'ret'
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 56,
      width: '100%',
      position: 'relative'
    }
  }));
}
Object.assign(window, {
  IOSDevice,
  IOSStatusBar,
  IOSNavBar,
  IOSGlassPill,
  IOSList,
  IOSListRow,
  IOSKeyboard
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/ios-frame.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing/Sections.jsx
try { (() => {
const {
  Button,
  Logo,
  Card,
  Icon,
  Badge
} = window.FIBIDesignSystem_383abe;
const IMG = "https://www.fibi.world/";
function Shot({
  src,
  alt,
  ratio = "16 / 10",
  radius = "var(--radius-2xl)",
  style
}) {
  const [bad, setBad] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      aspectRatio: ratio,
      borderRadius: radius,
      overflow: "hidden",
      background: "var(--gradient-brand-soft)",
      boxShadow: "var(--shadow-xl)",
      display: "grid",
      placeItems: "center",
      ...style
    }
  }, bad ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-caption)",
      color: "var(--text-tertiary)"
    }
  }, src) : /*#__PURE__*/React.createElement("img", {
    src: IMG + src,
    alt: alt,
    onError: () => setBad(true),
    style: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      display: "block"
    }
  }));
}
function Section({
  id,
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("section", {
    id: id,
    style: {
      padding: "var(--space-13) var(--gutter-desktop)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--container-max)",
      margin: "0 auto"
    }
  }, children));
}
function Eyebrow({
  children
}) {
  return /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--type-caption)",
      fontWeight: "var(--fw-medium)",
      letterSpacing: "var(--ls-caps)",
      textTransform: "uppercase",
      color: "var(--text-tertiary)",
      margin: "0 0 var(--space-5)"
    }
  }, children);
}
function SiteHeader({
  onSignin
}) {
  return /*#__PURE__*/React.createElement("header", {
    style: {
      position: "sticky",
      top: 0,
      zIndex: 30,
      background: "var(--surface-glass)",
      backdropFilter: "var(--blur-glass)",
      WebkitBackdropFilter: "var(--blur-glass)",
      borderBottom: "1px solid var(--border-subtle)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--container-max)",
      margin: "0 auto",
      padding: "0 var(--gutter-desktop)",
      height: 68,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#top",
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Logo, {
    variant: "mark",
    height: 30
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fw-semibold) 20px/1 var(--font-sans)",
      letterSpacing: "var(--ls-tight)",
      color: "var(--text-primary)"
    }
  }, "FiBi")), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    onClick: onSignin
  }, "Sign in")));
}
function Hero({
  onStart
}) {
  return /*#__PURE__*/React.createElement("div", {
    id: "top",
    style: {
      position: "relative",
      background: "var(--bg-page)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      background: "var(--wash-aurora)",
      pointerEvents: "none"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      maxWidth: "var(--container-max)",
      margin: "0 auto",
      padding: "var(--space-13) var(--gutter-desktop) var(--space-12)",
      display: "grid",
      gridTemplateColumns: "1.05fr .95fr",
      gap: "var(--space-12)",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      font: "var(--type-display)",
      letterSpacing: "var(--ls-tighter)",
      margin: 0,
      textWrap: "balance"
    }
  }, "Organise your travel inspiration."), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--fw-medium) 22px/1.35 var(--font-sans)",
      letterSpacing: "var(--ls-tight)",
      color: "var(--text-secondary)",
      margin: "var(--space-6) 0 0"
    }
  }, "Beautifully. Simply. Calmly."), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--type-body-lg)",
      color: "var(--text-secondary)",
      margin: "var(--space-6) 0 0",
      maxWidth: 440,
      textWrap: "pretty"
    }
  }, "Share from TikTok, Instagram, or any app. We help you keep it organised."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-6)",
      marginTop: "var(--space-9)"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "gradient",
    size: "lg",
    onClick: onStart
  }, "Get started"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      font: "var(--type-label)",
      color: "var(--text-tertiary)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "smartphone",
    size: 16
  }), "Install Fibi to share in one tap"))), /*#__PURE__*/React.createElement(Shot, {
    src: "hero-image.png",
    alt: "FiBi - Save Your Travel Places",
    ratio: "4 / 5"
  })));
}
function HowItWorks() {
  const steps = [{
    img: "1.png",
    t: "Save it",
    d: "Share a link to FiBi directly from any app or website."
  }, {
    img: "2.png",
    t: "Make it yours",
    d: "Add a screenshot, name, and location to remember why you saved it."
  }, {
    img: "3.png",
    t: "Find it later",
    d: "Everything is organized in one calm, algorithm-free place for easy access."
  }];
  return /*#__PURE__*/React.createElement(Section, {
    style: {
      background: "var(--bg-subtle)"
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      font: "var(--type-h2)",
      letterSpacing: "var(--ls-tight)",
      margin: "0 0 var(--space-10)"
    }
  }, "How it works"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3,1fr)",
      gap: "var(--space-8)"
    }
  }, steps.map((s, i) => /*#__PURE__*/React.createElement(Card, {
    key: s.t,
    padding: "var(--space-6)",
    elevation: "sm"
  }, /*#__PURE__*/React.createElement(Shot, {
    src: s.img,
    alt: s.t,
    ratio: "4 / 3",
    radius: "var(--radius-lg)",
    style: {
      boxShadow: "none"
    }
  }), /*#__PURE__*/React.createElement("h3", {
    style: {
      font: "var(--type-h3)",
      letterSpacing: "var(--ls-tight)",
      margin: "var(--space-6) 0 var(--space-3)"
    }
  }, s.t), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--type-body)",
      color: "var(--text-secondary)",
      margin: 0,
      textWrap: "pretty"
    }
  }, s.d)))));
}
function ShareSteps() {
  const steps = [{
    t: "Find something to save",
    d: "Open TikTok, Instagram, YouTube, or any app with a post or video about a place you want to save.",
    chips: ["TikTok", "Instagram", "YouTube"]
  }, {
    t: "Tap the Share button",
    d: "Look for the share icon (usually → or \"Share\") on the post or video you want to save.",
    tip: ["💡 Tip:", "On TikTok, it's the arrow icon in the bottom right. On Instagram, tap the three dots menu → Share."]
  }, {
    t: "Select Fibi from Share Sheet",
    d: "Fibi will appear alongside other apps like Messages, WhatsApp, and more. Tap the Fibi icon.",
    tip: ["📱 Important:", "Make sure you've installed Fibi as an app first. If you don't see Fibi, install it from your browser menu."]
  }, {
    t: "Review and save",
    d: "Fibi automatically pulls through a visual preview with the title and description. Add your own screenshot or location details if you want, then save!",
    tip: ["✨ Auto-preview:", "No need to copy and paste — everything is pulled through automatically!"]
  }];
  return /*#__PURE__*/React.createElement(Section, null, /*#__PURE__*/React.createElement(Eyebrow, null, "How to share from your phone"), /*#__PURE__*/React.createElement("h2", {
    style: {
      font: "var(--type-h2)",
      letterSpacing: "var(--ls-tight)",
      margin: "0 0 var(--space-4)",
      maxWidth: 640,
      textWrap: "balance"
    }
  }, "Save places directly from TikTok, Instagram, and other apps \u2014 no copy-paste needed!"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "var(--space-8)",
      marginTop: "var(--space-10)"
    }
  }, steps.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: s.t,
    style: {
      display: "flex",
      gap: "var(--space-6)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: "0 0 40px",
      height: 40,
      borderRadius: "var(--radius-circle)",
      background: "var(--gradient-sky)",
      color: "#fff",
      display: "grid",
      placeItems: "center",
      font: "var(--fw-semibold) 16px/1 var(--font-sans)"
    }
  }, i + 1), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    style: {
      font: "var(--type-h4)",
      margin: "8px 0 var(--space-3)"
    }
  }, s.t), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--type-body)",
      color: "var(--text-secondary)",
      margin: 0,
      textWrap: "pretty"
    }
  }, s.d), s.chips && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginTop: "var(--space-5)"
    }
  }, s.chips.map(c => /*#__PURE__*/React.createElement(Badge, {
    key: c,
    tone: "neutral"
  }, c))), s.tip && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "var(--space-5)",
      background: "var(--bg-subtle)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-lg)",
      padding: "var(--space-5) var(--space-6)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-label)",
      color: "var(--text-primary)"
    }
  }, s.tip[0]), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--type-body)",
      color: "var(--text-secondary)",
      margin: "4px 0 0"
    }
  }, s.tip[1])))))));
}
function WhyFibi() {
  const items = [{
    i: "link-2",
    t: "No more lost links",
    d: "That restaurant you saw on Instagram? That beach from TikTok? Save it before it disappears from your feed."
  }, {
    i: "image",
    t: "Your context, your way",
    d: "Add screenshots and locations so you remember why you saved it and where it is."
  }, {
    i: "wind",
    t: "Calm and organised",
    d: "No algorithms, no noise. Just your saved places, organised how you want them."
  }];
  return /*#__PURE__*/React.createElement(Section, {
    style: {
      background: "var(--indigo-900)",
      color: "#F2F3F8"
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      font: "var(--type-h2)",
      letterSpacing: "var(--ls-tight)",
      margin: "0 0 var(--space-10)",
      color: "#fff"
    }
  }, "Why Fibi?"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3,1fr)",
      gap: "var(--space-8)"
    }
  }, items.map(x => /*#__PURE__*/React.createElement("div", {
    key: x.t
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 44,
      height: 44,
      borderRadius: "var(--radius-md)",
      background: "rgba(255,255,255,.08)",
      border: "1px solid var(--indigo-700)",
      display: "grid",
      placeItems: "center",
      color: "var(--sky-300)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: x.i,
    size: 20
  })), /*#__PURE__*/React.createElement("h3", {
    style: {
      font: "var(--type-h3)",
      letterSpacing: "var(--ls-tight)",
      margin: "var(--space-6) 0 var(--space-3)",
      color: "#fff"
    }
  }, x.t), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--type-body)",
      color: "#A9ADC4",
      margin: 0,
      textWrap: "pretty"
    }
  }, x.d)))), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--type-body-lg)",
      color: "#A9ADC4",
      margin: "var(--space-11) 0 0",
      maxWidth: 620,
      textWrap: "pretty"
    }
  }, "Share from TikTok, Instagram, or any app. Fibi automatically pulls through a visual preview \u2014 or add your own."));
}
function FinalCTA({
  onSignin
}) {
  return /*#__PURE__*/React.createElement(Section, {
    style: {
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      font: "var(--type-h1)",
      letterSpacing: "var(--ls-tighter)",
      margin: "0 0 var(--space-8)"
    }
  }, "Ready to start saving?"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "var(--space-5)",
      justifyContent: "center",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "gradient",
    size: "lg",
    onClick: onSignin
  }, "Sign in to start saving"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "lg"
  }, "Install the app")));
}
function SiteFooter() {
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      borderTop: "1px solid var(--border-subtle)",
      padding: "var(--space-9) var(--gutter-desktop)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--container-max)",
      margin: "0 auto",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: "var(--space-8)",
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-caption)",
      color: "var(--text-tertiary)"
    }
  }, "\xA9 2026 Fibi. Save places before you lose them."), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: "flex",
      gap: "var(--space-7)",
      font: "var(--type-label)"
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Privacy"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Terms"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Contact"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Sign in"))));
}
Object.assign(window, {
  Shot,
  Section,
  Eyebrow,
  SiteHeader,
  Hero,
  HowItWorks,
  ShareSteps,
  WhyFibi,
  FinalCTA,
  SiteFooter
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing/Sections.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Logo = __ds_scope.Logo;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.Dialog = __ds_scope.Dialog;

__ds_ns.EmptyState = __ds_scope.EmptyState;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.Tooltip = __ds_scope.Tooltip;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Field = __ds_scope.Field;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Radio = __ds_scope.Radio;

__ds_ns.SearchField = __ds_scope.SearchField;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Textarea = __ds_scope.Textarea;

__ds_ns.TabBar = __ds_scope.TabBar;

__ds_ns.Tabs = __ds_scope.Tabs;

__ds_ns.TopBar = __ds_scope.TopBar;

__ds_ns.CollectionTile = __ds_scope.CollectionTile;

__ds_ns.MapSurface = __ds_scope.MapSurface;

__ds_ns.PinMarker = __ds_scope.PinMarker;

__ds_ns.PlaceCard = __ds_scope.PlaceCard;

})();
