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
export declare type StockUserAssociationUpdateFormInputValues = {
    Id?: string;
    openingStocks?: number;
};
export declare type StockUserAssociationUpdateFormValidationValues = {
    Id?: ValidationFunction<string>;
    openingStocks?: ValidationFunction<number>;
};
export declare type PrimitiveOverrideProps<T> = Partial<T> & React.DOMAttributes<HTMLDivElement>;
export declare type StockUserAssociationUpdateFormOverridesProps = {
    StockUserAssociationUpdateFormGrid?: PrimitiveOverrideProps<GridProps>;
    Id?: PrimitiveOverrideProps<TextFieldProps>;
    openingStocks?: PrimitiveOverrideProps<TextFieldProps>;
} & EscapeHatchProps;
export declare type StockUserAssociationUpdateFormProps = React.PropsWithChildren<{
    overrides?: StockUserAssociationUpdateFormOverridesProps | undefined | null;
} & {
    Id?: string;
    stockUserAssociation?: any;
    onSubmit?: (fields: StockUserAssociationUpdateFormInputValues) => StockUserAssociationUpdateFormInputValues;
    onSuccess?: (fields: StockUserAssociationUpdateFormInputValues) => void;
    onError?: (fields: StockUserAssociationUpdateFormInputValues, errorMessage: string) => void;
    onChange?: (fields: StockUserAssociationUpdateFormInputValues) => StockUserAssociationUpdateFormInputValues;
    onValidate?: StockUserAssociationUpdateFormValidationValues;
} & React.CSSProperties>;
export default function StockUserAssociationUpdateForm(props: StockUserAssociationUpdateFormProps): React.ReactElement;
