import type React from 'react'
import type {LayoutProps} from 'sanity'

import {type VariantPickerLabels, VariantPickerLabelsContext} from './labels'

/**
 * A Studio layout that provides `variantPicker({labels})` to every picker in the workspace: the
 * `variantPicker` type, `stringLists` fields, and fields that set `VariantPickerInput` themselves.
 */
export function createLabelsLayout(
  labels: VariantPickerLabels,
): (props: LayoutProps) => React.JSX.Element {
  return function VariantPickerLabelsLayout(props) {
    return (
      <VariantPickerLabelsContext.Provider value={labels}>
        {props.renderDefault(props)}
      </VariantPickerLabelsContext.Provider>
    )
  }
}
