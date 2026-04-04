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
export declare type StockUserAssociationCreateFormInputValues = {
    Id?: string;
    stockId?: string;
    userProfileId?: string;
    openingStocks?: number;
};
export declare type StockUserAssociationCreateFormValidationValues = {
    Id?: ValidationFunction<string>;
    stockId?: ValidationFunction<string>;
    userProfileId?: ValidationFunction<string>;
    openingStocks?: ValidationFunction<number>;
};
export declare type PrimitiveOverrideProps<T> = Partial<T> & React.DOMAttributes<HTMLDivElement>;
export declare type StockUserAssociationCreateFormOverridesProps = {
    StockUserAssociationCreateFormGrid?: PrimitiveOverrideProps<GridProps>;
    Id?: PrimitiveOverrideProps<TextFieldProps>;
    stockId?: PrimitiveOverrideProps<TextFieldProps>;
    userProfileId?: PrimitiveOverrideProps<TextFieldProps>;
    openingStocks?: PrimitiveOverrideProps<TextFieldProps>;
} & EscapeHatchProps;
export declare type StockUserAssociationCreateFormProps = React.PropsWithChildren<{
    overrides?: StockUserAssociationCreateFormOverridesProps | undefined | null;
} & {
    clearOnSuccess?: boolean;
    onSubmit?: (fields: StockUserAssociationCreateFormInputValues) => StockUserAssociationCreateFormInputValues;
    onSuccess?: (fields: StockUserAssociationCreateFormInputValues) => void;
    onError?: (fields: StockUserAssociationCreateFormInputValues, errorMessage: string) => void;
    onChange?: (fields: StockUserAssociationCreateFormInputValues) => StockUserAssociationCreateFormInputValues;
    onValidate?: StockUserAssociationCreateFormValidationValues;
} & React.CSSProperties>;
export default function StockUserAssociationCreateForm(props: StockUserAssociationCreateFormProps): React.ReactElement;
