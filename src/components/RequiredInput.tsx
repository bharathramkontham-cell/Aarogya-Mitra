import * as React from 'react';
import { FieldStack, Label, Textarea } from './tailwind';

interface RequiredProps {
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label: string;
  hint?: string;
  error?: string;
  rows?: number;
  required?: boolean;
}

export function TextField(props: RequiredProps) {
  const [touched, setTouched] = React.useState(false);

  React.useEffect(() => {
    const handler = setTimeout(() => setTouched(true), 600);
    return () => clearTimeout(handler);
  }, [props.value]);

  const error = props.error && touched ? props.error : props.error;

  return (
    <FieldStack>
      <Label htmlFor={props.name}>
        {props.label} {props.required ? <span className="text-red-600" aria-label="required">*</span> : null}
      </Label>
      <Textarea
        name={props.name}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        rows={props.rows ?? 3}
        aria-describedby={error ? `${props.name}-error` : undefined}
        className="border border-slate-300 rounded-md bg-white px-3 py-2 text-sm ring-1 ring-slate-200 transition focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-y"
      />
      {props.hint && <p className="text-xs text-slate-500">{props.hint}</p>}
      {error && (
        <p className="text-xs text-red-600" id={`${props.name}-error`} role="alert">
          * {error}
        </p>
      )}
    </FieldStack>
  );
}
