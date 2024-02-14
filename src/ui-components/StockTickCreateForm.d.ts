/***************************************************************************
 * The contents of this file were generated with Amplify Studio.           *
 * Please refrain from making any modifications to this file.              *
 * Any changes to this file will be overwritten when running amplify pull. *
 **************************************************************************/

import * as React from "react";
import { GridProps, TextFieldProps } from "@aws-amplify/ui-react";
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
export declare type StockTickCreateFormInputValues = {
    Id?: string;
    LTP?: number;
    tickTime?: string;
};
export declare type StockTickCreateFormValidationValues = {
    Id?: ValidationFunction<string>;
    LTP?: ValidationFunction<number>;
    tickTime?: ValidationFunction<string>;
};
export declare type PrimitiveOverrideProps<T> = Partial<T> & React.DOMAttributes<HTMLDivElement>;
export declare type StockTickCreateFormOverridesProps = {
    StockTickCreateFormGrid?: PrimitiveOverrideProps<GridProps>;
    Id?: PrimitiveOverrideProps<TextFieldProps>;
    LTP?: PrimitiveOverrideProps<TextFieldProps>;
    tickTime?: PrimitiveOverrideProps<TextFieldProps>;
} & EscapeHatchProps;
export declare type StockTickCreateFormProps = React.PropsWithChildren<{
    overrides?: StockTickCreateFormOverridesProps | undefined | null;
} & {
    clearOnSuccess?: boolean;
    onSubmit?: (fields: StockTickCreateFormInputValues) => StockTickCreateFormInputValues;
    onSuccess?: (fields: StockTickCreateFormInputValues) => void;
    onError?: (fields: StockTickCreateFormInputValues, errorMessage: string) => void;
    onChange?: (fields: StockTickCreateFormInputValues) => StockTickCreateFormInputValues;
    onValidate?: StockTickCreateFormValidationValues;
} & React.CSSProperties>;
export default function StockTickCreateForm(props: StockTickCreateFormProps): React.ReactElement;
