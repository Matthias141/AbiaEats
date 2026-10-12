"use client";
import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { Input as PrimitiveInput } from "@/components/ui/primitives/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/primitives/field";
import { InputGroup, InputGroupInput, InputGroupAddon } from "@/components/ui/primitives/input-group";
interface InputProps extends InputHTMLAttributes<HTMLInputElement> { label?: string; error?: string; icon?: React.ReactNode; }
export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, icon, id, ...props }, ref) => {
  const generatedId = useId(); const inputId = id || generatedId; const errorId = `${inputId}-error`;
  const inputProps = { ...props, id: inputId, ref, "aria-invalid": error ? true : props["aria-invalid"], "aria-describedby": [props["aria-describedby"], error ? errorId : null].filter(Boolean).join(" ") || undefined };
  return <Field data-invalid={Boolean(error)} data-disabled={props.disabled}>
    {label && <FieldLabel htmlFor={inputId}>{label}</FieldLabel>}
    {icon ? <InputGroup><InputGroupAddon aria-hidden="true">{icon}</InputGroupAddon><InputGroupInput {...inputProps} /></InputGroup> : <PrimitiveInput {...inputProps} />}
    {error && <FieldError id={errorId} role="alert">{error}</FieldError>}
  </Field>;
});
Input.displayName = "Input";
