import { Control, FieldValues, Path, useController } from 'react-hook-form'
import { Text, View } from 'react-native'
import { Input, type InputProps } from './input'
import { InputError } from './input-error'

interface ControlledInputProps<T extends FieldValues> extends Omit<
  InputProps,
  'value' | 'onChangeText' | 'onBlur' | 'error'
> {
  control: Control<T, any, any>
  name: Path<T>
  label?: string
  required?: boolean
  error?: string
  containerClassName?: string
}

export function ControlledInput<T extends FieldValues>({
  control,
  name,
  className,
  containerClassName,
  label,
  required,
  error: customError,
  ...inputProps
}: ControlledInputProps<T>) {
  const {
    field: { onChange, onBlur, value },
    fieldState: { error: formError },
  } = useController({
    control,
    name,
  })

  const errorMessage = customError || formError?.message

  return (
    <View className={containerClassName ?? 'mb-4'}>
      {label ? (
        <Text className="mb-2 font-bold text-xs uppercase tracking-wider text-slate-700">
          {label}
          {required ? <Text className="text-rose-500"> *</Text> : null}
        </Text>
      ) : null}
      <Input
        value={value ?? ''}
        onBlur={onBlur}
        onChangeText={onChange}
        error={!!errorMessage}
        className={className}
        {...inputProps}
      />
      {errorMessage ? <InputError message={errorMessage} /> : null}
    </View>
  )
}
