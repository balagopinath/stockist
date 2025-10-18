/***************************************************************************
 * The contents of this file were generated with Amplify Studio.           *
 * Please refrain from making any modifications to this file.              *
 * Any changes to this file will be overwritten when running amplify pull. *
 **************************************************************************/

import * as React from "react";
import { GridProps, TextFieldProps } from "@aws-amplify/ui-react";
import { EscapeHatchProps } from "@aws-amplify/ui-react/internal";
import { Exchange } from "../models";
export declare type ValidationResponse = {
    hasError: boolean;
    errorMessage?: string;
};
export declare type ValidationFunction<T> = (value: T, validationResponse: ValidationResponse) => ValidationResponse | Promise<ValidationResponse>;
export declare type ExchangeUpdateFormInputValues = {
    Id?: string;
    name?: string;
    code?: string;
};
export declare type ExchangeUpdateFormValidationValues = {
    Id?: ValidationFunction<string>;
    name?: ValidationFunction<string>;
    code?: ValidationFunction<string>;
};
export declare type PrimitiveOverrideProps<T> = Partial<T> & React.DOMAttributes<HTMLDivElement>;
export declare type ExchangeUpdateFormOverridesProps = {
    ExchangeUpdateFormGrid?: PrimitiveOverrideProps<GridProps>;
    Id?: PrimitiveOverrideProps<TextFieldProps>;
    name?: PrimitiveOverrideProps<TextFieldProps>;
    code?: PrimitiveOverrideProps<TextFieldProps>;
} & EscapeHatchProps;
export declare type ExchangeUpdateFormProps = React.PropsWithChildren<{
    overrides?: ExchangeUpdateFormOverridesProps | undefined | null;
} & {
    Id?: string;
    exchange?: Exchange;
    onSubmit?: (fields: ExchangeUpdateFormInputValues) => ExchangeUpdateFormInputValues;
    onSuccess?: (fields: ExchangeUpdateFormInputValues) => void;
    onError?: (fields: ExchangeUpdateFormInputValues, errorMessage: string) => void;
    onChange?: (fields: ExchangeUpdateFormInputValues) => ExchangeUpdateFormInputValues;
    onValidate?: ExchangeUpdateFormValidationValues;
} & React.CSSProperties>;
export default function ExchangeUpdateForm(props: ExchangeUpdateFormProps): React.ReactElement;
