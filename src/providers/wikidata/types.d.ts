type ResponseField = [
  'item',
  'itemLabel',
  'meltingPoint',
  'meltingPointUnit',
  'boilingPoint',
  'boilingPointUnit',
  'density',
  'densityUnit',
  'densityUnitLabel',
];

interface Binding {
  type: string;
  value: string;
}

interface LabelBinding extends Binding {
  'xml:lang'?: string;
}

interface ValueBinding extends Binding {
  datatype?: string;
}

interface Response {
  head: {
    vars: ResponseField;
  };
  results: {
    bindings: Array<{
      item: Binding;
      itemLabel: LabelBinding;
      meltingPoint: ValueBinding;
      meltingPointUnit: Binding;
      boilingPoint: ValueBinding;
      boilingPointUnit: Binding;
      density: ValueBinding;
      densityUnit: Binding;
      densityUnitLabel: Binding;
    }>;
  };
}
