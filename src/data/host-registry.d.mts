/**
 * The type twin for ./host-registry.mjs (the node-safe registry leaf),
 * the same pattern as ./site.d.mts: the source-form package compiles in
 * the consumer's toolchain, and TypeScript resolves the `.mjs`
 * specifier to this declaration. Keep the shape in lockstep with
 * host-registry.mjs — the values live there; only the type lives here.
 */
export declare const HOST_REGISTRY: readonly {
  readonly key: string
  readonly url: string
  readonly label: string
  readonly desc: string
}[]
