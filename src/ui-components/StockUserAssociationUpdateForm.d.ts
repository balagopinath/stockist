/***************************************************************************
 * The contents of this file were generated with Amplify Studio.           *
 * Please refrain from making any modifications to this file.              *
 * Any changes to this file will be overwritten when running amplify pull. *
 **************************************************************************/

import * as React from "react";
import { GridProps, TextFieldProps } from "@aws-amplify/ui-react";
import { EscapeHatchProps } from "@aws-amplify/ui-react/internal";
import { StockUserAssociation } from "../models";
export declare type ValidationResponse = {
    hasError: boolean;
    errorMessage?: string;
};
export declare type ValidationFunction<T> = (value: T, validationResponse: ValidationResponse) => ValidationResponse | Promise<ValidationResponse>;
export declare type StockUserAssociationUpdateFormInputValues = {
    Id?: string;
    stockId?: string;
    userProfileId?: string;
    openingStocks?: number;
};
export declare type StockUserAssociationUpdateFormValidationValues = {
    Id?: ValidationFunction<string>;
    stockId?: ValidationFunction<string>;
    userProfileId?: ValidationFunction<string>;
    openingStocks?: ValidationFunction<number>;
};
export declare type PrimitiveOverrideProps<T> = Partial<T> & React.DOMAttributes<HTMLDivElement>;
export declare type StockUserAssociationUpdateFormOverridesProps = {
    StockUserAssociationUpdateFormGrid?: PrimitiveOverrideProps<GridProps>;
    Id?: PrimitiveOverrideProps<TextFieldProps>;
    stockId?: PrimitiveOverrideProps<TextFieldProps>;
    userProfileId?: PrimitiveOverrideProps<TextFieldProps>;
    openingStocks?: PrimitiveOverrideProps<TextFieldProps>;
} & EscapeHatchProps;
export declare type StockUserAssociationUpdateFormProps = React.PropsWithChildren<{
    overrides?: StockUserAssociationUpdateFormOverridesProps | undefined | null;
} & {
    Id?: string;
    stockUserAssociation?: StockUserAssociation;
    onSubmit?: (fields: StockUserAssociationUpdateFormInputValues) => StockUserAssociationUpdateFormInputValues;
    onSuccess?: (fields: StockUserAssociationUpdateFormInputValues) => void;
    onError?: (fields: StockUserAssociationUpdateFormInputValues, errorMessage: string) => void;
    onChange?: (fields: StockUserAssociationUpdateFormInputValues) => StockUserAssociationUpdateFormInputValues;
    onValidate?: StockUserAssociationUpdateFormValidationValues;
} & React.CSSProperties>;
export default function StockUserAssociationUpdateForm(props: StockUserAssociationUpdateFormProps): React.ReactElement;
