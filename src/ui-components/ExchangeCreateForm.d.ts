/***************************************************************************
 * The contents of this file were generated with Amplify Studio.           *
 * Please refrain from making any modifications to this file.              *
 * Any changes to this file will be overwritten when running amplify pull. *
 **************************************************************************/

import * as React from "react";
import { GridProps, TextFieldProps } from "@aws-amplify/ui-react";
import { EscapeHatchProps } from "@aws-amplify/ui-react/internal";
export declare type ValidationResponse = {
    hasError: boolean;
    errorMessage?: string;
};
export declare type ValidationFunction<T> = (value: T, validationResponse: ValidationResponse) => ValidationResponse | Promise<ValidationResponse>;
export declare type ExchangeCreateFormInputValues = {
    Id?: string;
    name?: string;
    code?: string;
};
export declare type ExchangeCreateFormValidationValues = {
    Id?: ValidationFunction<string>;
    name?: ValidationFunction<string>;
    code?: ValidationFunction<string>;
};
export declare type PrimitiveOverrideProps<T> = Partial<T> & React.DOMAttributes<HTMLDivElement>;
export declare type ExchangeCreateFormOverridesProps = {
    ExchangeCreateFormGrid?: PrimitiveOverrideProps<GridProps>;
    Id?: PrimitiveOverrideProps<TextFieldProps>;
    name?: PrimitiveOverrideProps<TextFieldProps>;
    code?: PrimitiveOverrideProps<TextFieldProps>;
} & EscapeHatchProps;
export declare type ExchangeCreateFormProps = React.PropsWithChildren<{
    overrides?: ExchangeCreateFormOverridesProps | undefined | null;
} & {
    clearOnSuccess?: boolean;
    onSubmit?: (fields: ExchangeCreateFormInputValues) => ExchangeCreateFormInputValues;
    onSuccess?: (fields: ExchangeCreateFormInputValues) => void;
    onError?: (fields: ExchangeCreateFormInputValues, errorMessage: string) => void;
    onChange?: (fields: ExchangeCreateFormInputValues) => ExchangeCreateFormInputValues;
    onValidate?: ExchangeCreateFormValidationValues;
} & React.CSSProperties>;
export default function ExchangeCreateForm(props: ExchangeCreateFormProps): React.ReactElement;
