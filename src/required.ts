import {ConcreteRuleClass, type SchemaType} from 'sanity'

type RuleLike = {isRequired?: () => boolean}

/** Flattens a validation result: a rule, a list of rules, or nothing. */
const toRules = (value: unknown): RuleLike[] =>
  (Array.isArray(value) ? value : [value]).flatMap((entry) =>
    entry && typeof entry === 'object' ? [entry as RuleLike] : [],
  )

/**
 * Whether the field's schema `validation` marks it required (`Rule.required()`). The builder is
 * run against Sanity's own `Rule` class, like the validator does; anything that fails to run (a
 * builder that needs document context) counts as not required.
 */
export function isRequiredType(schemaType: Pick<SchemaType, 'validation'>): boolean {
  const validation = schemaType.validation as unknown
  if (!validation) return false
  try {
    const entries = Array.isArray(validation) ? validation : [validation]
    return entries.some((entry) => {
      const result =
        typeof entry === 'function'
          ? (entry as (rule: unknown) => unknown)(new ConcreteRuleClass())
          : entry
      return toRules(result).some((rule) => rule.isRequired?.() === true)
    })
  } catch {
    return false
  }
}
