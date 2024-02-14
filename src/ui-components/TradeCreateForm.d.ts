/***************************************************************************
 * The contents of this file were generated with Amplify Studio.           *
 * Please refrain from making any modifications to this file.              *
 * Any changes to this file will be overwritten when running amplify pull. *
 **************************************************************************/

import * as React from "react";
import { GridProps, SwitchFieldProps, TextFieldProps } from "@aws-amplify/ui-react";
export declare type EscapeHatchProps = {
    [elementHierarchy: string]: Record<string, unknown>;
} | null;
export declare type VariantValues = {
    [key: string]: string;
};
export declare type Variant = {
    variantValues: VariantValues;
    overrides: EscapeHatchProps;
};
export declare type ValidationResponse = {
    hasError: boolean;
    errorMessage?: string;
};
export declare type ValidationFunction<T> = (value: T, validationResponse: ValidationResponse) => ValidationResponse | Promise<ValidationResponse>;
export declare type TradeCreateFormInputValues = {
    Id?: string;
    isBuy?: boolean;
    price?: number;
    tranDate?: string;
};
export declare type TradeCreateFormValidationValues = {
    Id?: ValidationFunction<string>;
    isBuy?: ValidationFunction<boolean>;
    price?: ValidationFunction<number>;
    tranDate?: ValidationFunction<string>;
};
export declare type PrimitiveOverrideProps<T> = Partial<T> & React.DOMAttributes<HTMLDivElement>;
export declare type TradeCreateFormOverridesProps = {
    TradeCreateFormGrid?: PrimitiveOverrideProps<GridProps>;
    Id?: PrimitiveOverrideProps<TextFieldProps>;
    isBuy?: PrimitiveOverrideProps<SwitchFieldProps>;
    price?: PrimitiveOverrideProps<TextFieldProps>;
    tranDate?: PrimitiveOverrideProps<TextFieldProps>;
} & EscapeHatchProps;
export declare type TradeCreateFormProps = React.PropsWithChildren<{
    overrides?: TradeCreateFormOverridesProps | undefined | null;
} & {
    clearOnSuccess?: boolean;
    onSubmit?: (fields: TradeCreateFormInputValues) => TradeCreateFormInputValues;
    onSuccess?: (fields: TradeCreateFormInputValues) => void;
    onError?: (fields: TradeCreateFormInputValues, errorMessage: string) => void;
    onChange?: (fields: TradeCreateFormInputValues) => TradeCreateFormInputValues;
    onValidate?: TradeCreateFormValidationValues;
} & React.CSSProperties>;
export default function TradeCreateForm(props: TradeCreateFormProps): React.ReactElement;
