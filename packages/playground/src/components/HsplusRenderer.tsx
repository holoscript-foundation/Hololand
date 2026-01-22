/**
 * HsplusRenderer.tsx
 * 
 * React bridge component for rendering HoloScript+ (.hsplus) components
 * within a React application. This enables gradual migration from React
 * to native .hsplus while maintaining interoperability.
 * 
 * Features:
 * - Renders compiled .hsplus components as React elements
 * - Passes props between React and .hsplus component systems
 * - Handles lifecycle synchronization
 * - Supports event bubbling between systems
 * - CSS variable injection for theming
 * 
 * @package @hololand/playground
 * @version 2.0.0
 */

import React, { 
  useEffect, 
  useRef, 
  useState, 
  useCallback,
  useMemo,
  forwardRef,
  useImperativeHandle
} from 'react'

// =============================================================================
// TYPES
// =============================================================================

/**
 * Compiled .hsplus component interface
 */
export interface HsplusComponent {
  name: string
  render: (props: Record<string, unknown>, state: Record<string, unknown>) => HsplusVNode
  defaultProps?: Record<string, unknown>
  defaultState?: Record<string, unknown>
  methods?: Record<string, (...args: unknown[]) => unknown>
  computed?: Record<string, () => unknown>
  styles?: string
  onMount?: () => void
  onUnmount?: () => void
  onPropsChange?: (prop: string, oldValue: unknown, newValue: unknown) => void
}

/**
 * Virtual node representation from .hsplus render
 */
export interface HsplusVNode {
  tag: string
  props: Record<string, unknown>
  children: (HsplusVNode | string)[]
  events?: Record<string, (...args: unknown[]) => void>
  ref?: { current: HTMLElement | null }
}

/**
 * Props for HsplusRenderer
 */
export interface HsplusRendererProps {
  /** The compiled .hsplus component to render */
  component: HsplusComponent
  /** Props to pass to the .hsplus component */
  props?: Record<string, unknown>
  /** Initial state override */
  initialState?: Record<string, unknown>
  /** Theme CSS variables */
  theme?: 'dark' | 'light' | Record<string, string>
  /** Class name for the wrapper */
  className?: string
  /** Style for the wrapper */
  style?: React.CSSProperties
  /** Callback when component mounts */
  onMount?: () => void
  /** Callback when component unmounts */
  onUnmount?: () => void
  /** Callback when state changes */
  onStateChange?: (state: Record<string, unknown>) => void
  /** Error boundary fallback */
  fallback?: React.ReactNode
}

/**
 * Ref interface for imperative control
 */
export interface HsplusRendererRef {
  /** Get current state */
  getState: () => Record<string, unknown>
  /** Set state */
  setState: (updates: Record<string, unknown>) => void
  /** Call a method on the component */
  callMethod: (name: string, ...args: unknown[]) => unknown
  /** Get a computed value */
  getComputed: (name: string) => unknown
  /** Force re-render */
  forceUpdate: () => void
}

// =============================================================================
// THEME PRESETS
// =============================================================================

const DARK_THEME: Record<string, string> = {
  '--bg-primary': '#111827',
  '--bg-secondary': '#1f2937',
  '--bg-tertiary': '#374151',
  '--bg-hover': '#4b5563',
  '--text-primary': '#e5e7eb',
  '--text-secondary': '#9ca3af',
  '--text-muted': '#6b7280',
  '--border': '#374151',
  '--border-light': '#1f2937',
  '--primary': '#3b82f6',
  '--success': '#22c55e',
  '--warning': '#eab308',
  '--error': '#ef4444',
  '--metric-good': '#10b981',
  '--metric-warning': '#f59e0b',
  '--metric-critical': '#ef4444',
}

const LIGHT_THEME: Record<string, string> = {
  '--bg-primary': '#ffffff',
  '--bg-secondary': '#f9fafb',
  '--bg-tertiary': '#f3f4f6',
  '--bg-hover': '#e5e7eb',
  '--text-primary': '#111827',
  '--text-secondary': '#4b5563',
  '--text-muted': '#9ca3af',
  '--border': '#e5e7eb',
  '--border-light': '#f3f4f6',
  '--primary': '#2563eb',
  '--success': '#16a34a',
  '--warning': '#ca8a04',
  '--error': '#dc2626',
  '--metric-good': '#059669',
  '--metric-warning': '#d97706',
  '--metric-critical': '#dc2626',
}

// =============================================================================
// VNODE TO REACT CONVERTER
// =============================================================================

/**
 * Convert .hsplus VNode to React element
 */
function vnodeToReact(
  vnode: HsplusVNode | string,
  key?: string | number
): React.ReactNode {
  // Handle text nodes
  if (typeof vnode === 'string') {
    return vnode
  }

  // Extract event handlers and convert to React format
  const reactProps: Record<string, unknown> = { ...vnode.props }
  
  if (vnode.events) {
    for (const [event, handler] of Object.entries(vnode.events)) {
      // Convert on_click to onClick, on_input to onInput, etc.
      const reactEvent = event.replace(/^on_/, 'on')
        .replace(/_([a-z])/g, (_, c) => c.toUpperCase())
      reactProps[reactEvent] = handler
    }
  }

  // Handle ref
  if (vnode.ref) {
    reactProps.ref = vnode.ref
  }

  // Add key if provided
  if (key !== undefined) {
    reactProps.key = key
  }

  // Convert className if present as class
  if (reactProps.class) {
    reactProps.className = reactProps.class
    delete reactProps.class
  }

  // Handle children
  const children = vnode.children?.map((child, i) => vnodeToReact(child, i)) ?? []

  // Create React element
  return React.createElement(
    vnode.tag,
    reactProps,
    ...children
  )
}

// =============================================================================
// STYLE INJECTOR
// =============================================================================

/**
 * Inject component styles into document
 */
function useStyleInjection(styles: string | undefined, componentName: string): void {
  useEffect(() => {
    if (!styles) return

    const styleId = `hsplus-style-${componentName}`
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null

    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = styleId
      document.head.appendChild(styleEl)
    }

    styleEl.textContent = styles

    return () => {
      // Don't remove styles on unmount - other instances may need them
      // Styles are deduplicated by component name
    }
  }, [styles, componentName])
}

// =============================================================================
// HSPLUS RENDERER COMPONENT
// =============================================================================

/**
 * React component that renders .hsplus components
 */
export const HsplusRenderer = forwardRef<HsplusRendererRef, HsplusRendererProps>(
  function HsplusRenderer(props, ref) {
    const {
      component,
      props: componentProps = {},
      initialState,
      theme = 'dark',
      className,
      style,
      onMount,
      onUnmount,
      onStateChange,
      fallback,
    } = props

    // Component state
    const [state, setState] = useState<Record<string, unknown>>(() => ({
      ...component.defaultState,
      ...initialState,
    }))
    
    const [, forceUpdate] = useState({})
    const [error, setError] = useState<Error | null>(null)
    
    // Refs
    const containerRef = useRef<HTMLDivElement>(null)
    const mountedRef = useRef(false)

    // Merge props with defaults
    const mergedProps = useMemo(() => ({
      ...component.defaultProps,
      ...componentProps,
    }), [component.defaultProps, componentProps])

    // Theme styles
    const themeStyles = useMemo(() => {
      if (typeof theme === 'object') return theme
      return theme === 'dark' ? DARK_THEME : LIGHT_THEME
    }, [theme])

    // Inject component styles
    useStyleInjection(component.styles, component.name)

    // Create component context for methods
    const componentContext = useMemo(() => ({
      props: mergedProps,
      state,
      setState: (updates: Record<string, unknown>) => {
        setState(prev => {
          const next = { ...prev, ...updates }
          onStateChange?.(next)
          return next
        })
      },
    }), [mergedProps, state, onStateChange])

    // Bind methods
    const boundMethods = useMemo(() => {
      if (!component.methods) return {}
      
      const bound: Record<string, (...args: unknown[]) => unknown> = {}
      for (const [name, method] of Object.entries(component.methods)) {
        bound[name] = (...args: unknown[]) => method.call(componentContext, ...args)
      }
      return bound
    }, [component.methods, componentContext])

    // Bind computed
    const boundComputed = useMemo(() => {
      if (!component.computed) return {}
      
      const bound: Record<string, () => unknown> = {}
      for (const [name, compute] of Object.entries(component.computed)) {
        bound[name] = () => compute.call(componentContext)
      }
      return bound
    }, [component.computed, componentContext])

    // Expose imperative handle
    useImperativeHandle(ref, () => ({
      getState: () => state,
      setState: (updates) => setState(prev => ({ ...prev, ...updates })),
      callMethod: (name, ...args) => boundMethods[name]?.(...args),
      getComputed: (name) => boundComputed[name]?.(),
      forceUpdate: () => forceUpdate({}),
    }), [state, boundMethods, boundComputed])

    // Handle mount/unmount
    useEffect(() => {
      if (!mountedRef.current) {
        mountedRef.current = true
        component.onMount?.call(componentContext)
        onMount?.()
      }

      return () => {
        component.onUnmount?.call(componentContext)
        onUnmount?.()
      }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // Handle props changes
    const prevPropsRef = useRef(mergedProps)
    useEffect(() => {
      const prevProps = prevPropsRef.current
      
      for (const key of Object.keys(mergedProps)) {
        if (prevProps[key] !== mergedProps[key]) {
          component.onPropsChange?.call(
            componentContext,
            key,
            prevProps[key],
            mergedProps[key]
          )
        }
      }
      
      prevPropsRef.current = mergedProps
    }, [mergedProps, component.onPropsChange, componentContext])

    // Render the component
    const renderComponent = useCallback(() => {
      try {
        // Create render context with methods and computed
        const _renderContext = {
          props: mergedProps,
          state,
          ...boundMethods,
          ...Object.fromEntries(
            Object.entries(boundComputed).map(([k, v]) => [k, v()])
          ),
        }

        const vnode = component.render(mergedProps, state)
        return vnodeToReact(vnode)
      } catch (err) {
        setError(err as Error)
        return null
      }
    }, [component, mergedProps, state, boundMethods, boundComputed])

    // Error boundary
    if (error) {
      if (fallback) {
        return <>{fallback}</>
      }
      return (
        <div className="hsplus-error" style={{ color: 'red', padding: '1rem' }}>
          <strong>HoloScript+ Render Error:</strong>
          <pre>{error.message}</pre>
        </div>
      )
    }

    return (
      <div
        ref={containerRef}
        className={`hsplus-renderer hsplus-${component.name} ${className ?? ''}`}
        style={{ ...themeStyles as React.CSSProperties, ...style }}
        data-hsplus-component={component.name}
      >
        {renderComponent()}
      </div>
    )
  }
)

// =============================================================================
// HOOK: useHsplusComponent
// =============================================================================

/**
 * Hook for using .hsplus components in React function components
 */
export function useHsplusComponent(
  component: HsplusComponent,
  initialProps?: Record<string, unknown>,
  initialState?: Record<string, unknown>
) {
  const [props, setProps] = useState(initialProps ?? {})
  const [state, setState] = useState({
    ...component.defaultState,
    ...initialState,
  })
  
  const ref = useRef<HsplusRendererRef>(null)

  const updateProps = useCallback((updates: Record<string, unknown>) => {
    setProps(prev => ({ ...prev, ...updates }))
  }, [])

  const callMethod = useCallback((name: string, ...args: unknown[]) => {
    return ref.current?.callMethod(name, ...args)
  }, [])

  const getComputed = useCallback((name: string) => {
    return ref.current?.getComputed(name)
  }, [])

  return {
    ref,
    props,
    state,
    setProps: updateProps,
    setState,
    callMethod,
    getComputed,
    Component: (additionalProps: Partial<HsplusRendererProps>) => (
      <HsplusRenderer
        ref={ref}
        component={component}
        props={props}
        initialState={state}
        onStateChange={setState}
        {...additionalProps}
      />
    ),
  }
}

// =============================================================================
// HOC: withHsplus
// =============================================================================

/**
 * Higher-order component to wrap .hsplus components as React components
 */
export function withHsplus<P extends Record<string, unknown>>(
  component: HsplusComponent,
  defaultProps?: Partial<P>
): React.FC<P & Partial<HsplusRendererProps>> {
  const WrappedComponent: React.FC<P & Partial<HsplusRendererProps>> = (props) => {
    const { theme, className, style, onMount, onUnmount, ...componentProps } = props
    
    return (
      <HsplusRenderer
        component={component}
        props={{ ...defaultProps, ...componentProps }}
        theme={theme}
        className={className}
        style={style}
        onMount={onMount}
        onUnmount={onUnmount}
      />
    )
  }
  
  WrappedComponent.displayName = `Hsplus(${component.name})`
  
  return WrappedComponent
}

// =============================================================================
// COMPILER STUB (FOR FUTURE RUNTIME COMPILATION)
// =============================================================================

/**
 * Stub for runtime .hsplus compilation
 * In production, .hsplus files are pre-compiled, but this enables
 * runtime compilation for development/playground
 */
export async function compileHsplus(_source: string): Promise<HsplusComponent> {
  // This would integrate with @holoscript/core parser
  throw new Error(
    'Runtime compilation not implemented. ' +
    'Import pre-compiled .hsplus components instead.'
  )
}

// =============================================================================
// EXPORTS
// =============================================================================

export default HsplusRenderer
